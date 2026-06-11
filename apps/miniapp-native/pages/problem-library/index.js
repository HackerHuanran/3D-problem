const { listProblems, clearProblemCaches } = require('../../utils/problem-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const { getCurrentUser, requireLoginForAction, fetchProblemReactionStates, toggleProblemLike, toggleProblemDislike } = require('../../utils/user-service')
const LIBRARY_CACHE_KEY = 'problem_library_state_v1'
const LIBRARY_CACHE_TTL = 3 * 60 * 1000

function readLibraryCache() {
  try {
    const cache = wx.getStorageSync(LIBRARY_CACHE_KEY) || null
    if (!cache?.ts || Date.now() - cache.ts > LIBRARY_CACHE_TTL) return null
    return cache
  } catch (error) {
    return null
  }
}

function writeLibraryCache(state = {}) {
  try {
    wx.setStorageSync(LIBRARY_CACHE_KEY, {
      ...state,
      ts: Date.now(),
    })
  } catch (error) {
    console.warn('writeLibraryCache failed', error)
  }
}

Page({
  data: {
    query: '',
    loading: false,
    loadingMore: false,
    problems: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    searchTimer: null,
    currentUser: null,
    reactionLoadingMap: {},
  },

  lastRefreshAt: 0,
  skipNextShowRefresh: false,

  onLoad(query) {
    wx.hideLoading()
    const nextQuery = query.q ? decodeURIComponent(query.q) : ''
    const cache = readLibraryCache()
    this.skipNextShowRefresh = true
    if (cache && cache.query === nextQuery && Array.isArray(cache.problems)) {
      this.lastRefreshAt = cache.ts || Date.now()
      this.setData({
        query: cache.query || '',
        problems: cache.problems || [],
        page: cache.page || 1,
        hasMore: cache.hasMore !== false,
      })
      this.loadCurrentUser()
      return
    }
    this.setData({ query: nextQuery })
    this.loadProblems({ reset: true })
    this.loadCurrentUser()
  },

  async onShow() {
    if (this.skipNextShowRefresh) {
      this.skipNextShowRefresh = false
      return
    }
    if (String(this.data.query || '').trim()) return
    if (this.data.loading || this.data.loadingMore) return
    if (this.data.problems.length && Date.now() - this.lastRefreshAt < LIBRARY_CACHE_TTL) {
      await this.refreshReactionStates()
      return
    }
    await this.loadProblems({ reset: true })
  },

  async loadCurrentUser() {
    try {
      const user = await getCurrentUser()
      this.setData({ currentUser: user })
      if (this.data.problems.length) {
        await this.attachReactionStates(this.data.problems, user?.id || '')
      }
    } catch (error) {
      console.warn('load problem library current user failed', error)
    }
  },

  async refreshReactionStates() {
    try {
      let user = this.data.currentUser
      if (!user?.id) {
        user = await getCurrentUser()
        this.setData({ currentUser: user })
      }
      await this.attachReactionStates(this.data.problems, user?.id || '')
    } catch (error) {
      console.warn('refresh problem reactions failed', error)
    }
  },

  async attachReactionStates(problems = [], userId = '') {
    const ids = (problems || []).map((item) => item.id).filter(Boolean)
    if (!ids.length) return problems
    const { counts, likedIds, dislikeCounts, dislikedIds } = await fetchProblemReactionStates(userId, ids)
    const likedSet = new Set(likedIds || [])
    const dislikedSet = new Set(dislikedIds || [])
    const nextProblems = (problems || []).map((item) => ({
      ...item,
      likeCount: Number(counts?.[item.id] ?? item.likeCount ?? 0),
      liked: likedSet.has(item.id),
      dislikeCount: Number(dislikeCounts?.[item.id] ?? item.dislikeCount ?? 0),
      disliked: dislikedSet.has(item.id),
    }))
    this.setData({ problems: nextProblems })
    writeLibraryCache({
      query: this.data.query,
      problems: nextProblems,
      page: this.data.page,
      hasMore: this.data.hasMore,
    })
    return nextProblems
  },

  async onPullDownRefresh() {
    try {
      clearProblemCaches()
      this.lastRefreshAt = 0
      await this.loadProblems({ reset: true })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onUnload() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }
    wx.hideLoading()
  },

  onSearchInput(e) {
    this.setData({ query: e.detail.value })
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }
    const searchTimer = setTimeout(() => {
      this.loadProblems({ reset: true })
    }, 450)
    this.setData({ searchTimer })
  },

  async loadProblems({ reset = false } = {}) {
    const hasQuery = String(this.data.query || '').trim().length > 0
    const nextPage = reset ? 1 : this.data.page
    if (!reset && (!this.data.hasMore || this.data.loadingMore || this.data.loading)) {
      return
    }

    this.setData(reset ? { loading: true } : { loadingMore: true })
    if (reset) {
      showAppLoading('加载中')
    }
    try {
      const problems = await listProblems({
        query: this.data.query,
        page: nextPage,
        pageSize: this.data.pageSize,
        searchAll: hasQuery,
      })

      let mergedProblems = reset
        ? problems
        : hasQuery
        ? problems
        : this.data.problems.concat(problems)
      mergedProblems = await this.attachReactionStates(mergedProblems, this.data.currentUser?.id || '')

      this.setData({
        problems: mergedProblems,
        page: nextPage + 1,
        hasMore: hasQuery ? false : problems.length === this.data.pageSize,
      })
      this.lastRefreshAt = Date.now()
      writeLibraryCache({
        query: this.data.query,
        problems: mergedProblems,
        page: nextPage + 1,
        hasMore: hasQuery ? false : problems.length === this.data.pageSize,
      })
    } catch (error) {
      console.warn('loadProblems failed', error)
      if (reset) {
        this.setData({ problems: [], hasMore: false })
      }
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({
        loading: false,
        loadingMore: false,
      })
      if (reset) {
        hideAppLoading()
      }
    }
  },

  async onSearchConfirm() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
      this.setData({ searchTimer: null })
    }
    await this.loadProblems({ reset: true })
  },

  async onReachBottom() {
    if (String(this.data.query || '').trim()) return
    await this.loadProblems()
  },

  async openDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const user = await requireLoginForAction('请先登录后查看详情')
    if (!user?.id) return
    this.setData({ currentUser: user })
    showAppLoading('正在打开')
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${id}`,
      complete: () => {
        hideAppLoading()
      },
    })
  },

  async toggleProblemLike(e) {
    const id = String(e.currentTarget.dataset.id || '').trim()
    if (!id || this.data.reactionLoadingMap[id]) return
    let user = this.data.currentUser
    if (!user?.id) {
      user = await requireLoginForAction('请先登录后点赞')
      if (!user?.id) return
      this.setData({ currentUser: user })
    }
    this.setData({ [`reactionLoadingMap.${id}`]: true })
    try {
      const result = await toggleProblemLike(user.id, id)
      this.updateProblemReaction(id, result)
      wx.showToast({ title: result.liked ? '已点赞' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle problem like failed', error)
      wx.showToast({ title: '操作失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ [`reactionLoadingMap.${id}`]: false })
    }
  },

  async toggleProblemDislike(e) {
    const id = String(e.currentTarget.dataset.id || '').trim()
    if (!id || this.data.reactionLoadingMap[id]) return
    let user = this.data.currentUser
    if (!user?.id) {
      user = await requireLoginForAction('请先登录后操作')
      if (!user?.id) return
      this.setData({ currentUser: user })
    }
    this.setData({ [`reactionLoadingMap.${id}`]: true })
    try {
      const result = await toggleProblemDislike(user.id, id)
      this.updateProblemReaction(id, result)
      wx.showToast({ title: result.disliked ? '已标记' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle problem dislike failed', error)
      wx.showToast({ title: '操作失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ [`reactionLoadingMap.${id}`]: false })
    }
  },

  updateProblemReaction(id, result = {}) {
    const problems = (this.data.problems || []).map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        liked: result.liked,
        likeCount: result.count,
        disliked: result.disliked,
        dislikeCount: result.dislikeCount,
      }
    })
    this.setData({ problems })
    writeLibraryCache({
      query: this.data.query,
      problems,
      page: this.data.page,
      hasMore: this.data.hasMore,
    })
  },
})
