const { getCurrentUser, fetchHistory, readDashboardCache } = require('../../utils/user-service')
const { getProblemCount, getProblemDetail, listProblems, resolveProblemThumbUrl } = require('../../utils/problem-service')
const HOME_CACHE_KEY = 'miniapp_home_cache_v1'
const HOME_CACHE_TTL = 2 * 60 * 1000
const HOME_REFRESH_INTERVAL = 30 * 1000

function getHomeCache() {
  try {
    const cache = wx.getStorageSync(HOME_CACHE_KEY) || null
    if (!cache?.ts || Date.now() - cache.ts > HOME_CACHE_TTL) return null
    return cache
  } catch (error) {
    return null
  }
}

function setHomeCache(partial = {}) {
  try {
    const previous = wx.getStorageSync(HOME_CACHE_KEY) || {}
    wx.setStorageSync(HOME_CACHE_KEY, {
      ...previous,
      ...partial,
      ts: Date.now(),
    })
  } catch (error) {
    console.warn('setHomeCache failed', error)
  }
}

Page({
  data: {
    query: '',
    problemCount: 0,
    recentProblems: [],
    featuredProblems: [],
    navigating: false,
    entries: [
      {
        id: 'problems',
        title: '问题中心',
        desc: '搜索问题、看解决方案',
        image: '/images/home/problem-center.jpg',
      },
      {
        id: 'filament',
        title: '耗材库',
        desc: '查看材料参数与推荐',
        image: '/images/home/filament-library.jpg',
      },
      {
        id: 'knowledge',
        title: '知识库',
        desc: '学习参数和维护知识',
        image: '/images/home/knowledge-library.svg',
      },
      {
        id: 'services',
        title: '打印服务',
        desc: '查看工作室与工厂信息',
        image: '/images/home/services-workshop.jpg',
      },
    ],
  },

  lastRefreshAt: 0,
  refreshTimer: null,

  onLoad() {
    wx.hideLoading()
    const cache = getHomeCache()
    if (!cache) return
    this.setData({
      problemCount: Number(cache.problemCount) || 0,
      recentProblems: cache.recentProblems || [],
      featuredProblems: cache.featuredProblems || [],
    })
  },

  async onShow() {
    wx.hideLoading()
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    const hasVisibleData = !!(this.data.problemCount || this.data.recentProblems.length || this.data.featuredProblems.length)
    const shouldSkipRefresh = hasVisibleData && Date.now() - this.lastRefreshAt < HOME_REFRESH_INTERVAL
    if (shouldSkipRefresh) return
    this.refreshTimer = setTimeout(() => {
      this.lastRefreshAt = Date.now()
      this.loadRecentProblems()
      this.loadProblemCount()
      this.loadFeaturedProblems()
    }, hasVisibleData ? 80 : 0)
  },

  onUnload() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  },

  onQueryInput(e) {
    this.setData({ query: e.detail.value })
  },

  searchProblems() {
    if (this.data.navigating) return
    const keyword = String(this.data.query || '').trim()
    this.setData({ navigating: true })
    wx.navigateTo({
      url: `/pages/problem-library/index${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`,
      complete: () => this.setData({ navigating: false }),
    })
  },

  shareProblem() {
    if (this.data.navigating) return
    this.setData({ navigating: true })
    wx.navigateTo({
      url: '/pages/problem-submit/index',
      complete: () => this.setData({ navigating: false }),
    })
  },

  async loadFeaturedProblems() {
    if (this.data.featuredProblems.length) return
    try {
      const featuredProblems = await listProblems({ page: 1, pageSize: 3 })
      this.setData({ featuredProblems })
      setHomeCache({ featuredProblems })
    } catch (error) {
      console.warn('loadFeaturedProblems failed', error)
      if (!this.data.featuredProblems.length) {
        this.setData({ featuredProblems: [] })
      }
    }
  },

  async loadProblemCount() {
    try {
      const problemCount = await getProblemCount()
      this.setData({ problemCount: Number(problemCount) || 0 })
      setHomeCache({ problemCount: Number(problemCount) || 0 })
    } catch (error) {
      console.warn('loadProblemCount failed', error)
      if (!this.data.problemCount) {
        this.setData({ problemCount: 0 })
      }
    }
  },

  openEntry(e) {
    if (this.data.navigating) return
    const id = e.currentTarget.dataset.id
    this.setData({ navigating: true })
    if (id === 'problems') {
      wx.showLoading({ title: '正在打开' })
      wx.navigateTo({
        url: '/pages/problem-library/index',
        complete: () => this.setData({ navigating: false }),
      })
      return
    }
    if (id === 'filament') {
      wx.showLoading({ title: '正在打开' })
      wx.navigateTo({
        url: '/pages/filament/index',
        complete: () => this.setData({ navigating: false }),
      })
      return
    }
    if (id === 'knowledge') {
      wx.showLoading({ title: '正在打开' })
      wx.navigateTo({
        url: '/pages/knowledge/index',
        complete: () => this.setData({ navigating: false }),
      })
      return
    }
    if (id === 'services') {
      wx.showLoading({ title: '正在打开' })
      wx.navigateTo({
        url: '/pages/services/index',
        complete: () => this.setData({ navigating: false }),
      })
      return
    }
    this.setData({ navigating: false })
  },

  openRecentProblem(e) {
    if (this.data.navigating) return
    const problemId = e.currentTarget.dataset.problemId
    if (!problemId) return
    this.setData({ navigating: true })
    wx.showLoading({ title: '正在打开' })
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${problemId}`,
      complete: () => this.setData({ navigating: false }),
    })
  },

  async loadRecentProblems() {
    const user = await getCurrentUser()
    if (!user?.id) {
      this.setData({ recentProblems: [] })
      return
    }
    const dashboardCache = readDashboardCache(user.id)
    if (Array.isArray(dashboardCache?.historyProblems) && dashboardCache.historyProblems.length) {
      const recentProblems = dashboardCache.historyProblems.map((item, index) => ({
        id: item._id || item.id || `cached-recent-${index}`,
        problemId: item.id || item.problemId || '',
        title: item.title || '',
        subtitle: item.subtitle || '',
        category: item.category || '',
        image_url: item.image_url || '',
        thumb_url: item.thumb_url || item.image_url || '',
      })).filter((item) => item.problemId)
      if (recentProblems.length) {
        this.setData({ recentProblems })
        setHomeCache({ recentProblems })
      }
    }
    try {
      const rows = await fetchHistory(user.id)
      if (!rows.length) {
        this.setData({ recentProblems: [] })
        setHomeCache({ recentProblems: [] })
        return
      }
      const seen = new Set()
      const recentProblems = (await Promise.all(rows.map(async (historyItem, index) => {
        const doc = await getProblemDetail(historyItem.problem_id)
        if (!doc?.id || seen.has(doc.id)) return null
        seen.add(doc.id)
        const thumbUrl = await resolveProblemThumbUrl(doc.image_url, { width: 240, quality: 70 })
        return {
          id: historyItem._id || `${historyItem.problem_id || 'recent'}-${index}`,
          problemId: doc.id,
          title: doc.title || '',
          subtitle: doc.subtitle || '',
          category: doc.category || '',
          image_url: doc.image_url || '',
          thumb_url: thumbUrl || doc.thumb_url || doc.image_url || '',
        }
      }))).filter(Boolean)
      this.setData({ recentProblems })
      setHomeCache({ recentProblems })
    } catch (error) {
      console.warn('loadRecentProblems failed', error)
      if (!this.data.recentProblems.length) {
        this.setData({ recentProblems: [] })
      }
    }
  },
})
