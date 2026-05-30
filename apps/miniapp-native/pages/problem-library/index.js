const { listProblems } = require('../../utils/problem-service')
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
      return
    }
    this.setData({ query: nextQuery })
    this.loadProblems({ reset: true })
  },

  async onShow() {
    if (this.skipNextShowRefresh) {
      this.skipNextShowRefresh = false
      return
    }
    if (String(this.data.query || '').trim()) return
    if (this.data.loading || this.data.loadingMore) return
    if (this.data.problems.length && Date.now() - this.lastRefreshAt < LIBRARY_CACHE_TTL) {
      return
    }
    await this.loadProblems({ reset: true })
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
    try {
      const problems = await listProblems({
        query: this.data.query,
        page: nextPage,
        pageSize: this.data.pageSize,
        searchAll: hasQuery,
      })

      const mergedProblems = reset
        ? problems
        : hasQuery
        ? problems
        : this.data.problems.concat(problems)

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

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.showLoading({ title: '正在打开' })
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },
})
