const { getCurrentUser, requireLoginForAction, fetchHistory, readDashboardCache } = require('../../utils/user-service')
const { getProblemCount, getProblemDetail, listProblems, resolveProblemThumbUrl } = require('../../utils/problem-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')
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
    knowledgeCount: 0,
    serviceCount: 0,
    shareCount: 0,
    recentProblems: [],
    featuredProblems: [],
    navigating: false,
    moduleImageErrorMap: {},
    recentImageErrorMap: {},
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
  refreshingHome: false,
  lastNavigateAt: 0,

  onLoad() {
    wx.hideLoading()
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    const cache = getHomeCache()
    if (!cache) return
    this.setData({
      problemCount: Number(cache.problemCount) || 0,
      knowledgeCount: Number(cache.knowledgeCount) || 0,
      serviceCount: Number(cache.serviceCount) || 0,
      shareCount: Number(cache.shareCount) || 0,
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
    const hasVisibleData = !!(this.data.problemCount || this.data.knowledgeCount || this.data.serviceCount || this.data.recentProblems.length || this.data.featuredProblems.length)
    const shouldSkipRefresh = hasVisibleData && Date.now() - this.lastRefreshAt < HOME_REFRESH_INTERVAL
    if (shouldSkipRefresh) return
    this.refreshTimer = setTimeout(() => {
      this.refreshHomeData()
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

  async refreshHomeData() {
    if (this.refreshingHome) return
    this.refreshingHome = true
    this.lastRefreshAt = Date.now()
    try {
      await Promise.allSettled([
        this.loadHomeCounts(),
        this.loadRecentProblems(),
      ])
      await this.loadFeaturedProblems()
    } finally {
      this.refreshingHome = false
    }
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

  async shareProblem() {
    if (this.data.navigating) return
    const user = await requireLoginForAction('请先登录后分享问题')
    if (!user?.id) return
    this.setData({ navigating: true })
    wx.navigateTo({
      url: '/pages/problem-submit/index',
      complete: () => this.setData({ navigating: false }),
    })
  },

  async loadFeaturedProblems() {
    if (this.data.featuredProblems.length || this.data.recentProblems.length) return
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

  async loadHomeCounts() {
    try {
      const db = wx.cloud.database()
      const [problemCount, knowledgeRes, serviceRes] = await Promise.all([
        getProblemCount(),
        db.collection('user_problems').where({
          submission_type: 'knowledge',
          status: 'published',
        }).count(),
        db.collection('studio_services').count(),
      ])
      const nextProblemCount = Number(problemCount) || 0
      const nextKnowledgeCount = Number(knowledgeRes?.total || knowledgeRes?.count || 0)
      const nextServiceCount = Number(serviceRes?.total || serviceRes?.count || 0)
      const nextShareCount = nextProblemCount + nextKnowledgeCount
      this.setData({
        problemCount: nextProblemCount,
        knowledgeCount: nextKnowledgeCount,
        serviceCount: nextServiceCount,
        shareCount: nextShareCount,
      })
      setHomeCache({
        problemCount: nextProblemCount,
        knowledgeCount: nextKnowledgeCount,
        serviceCount: nextServiceCount,
        shareCount: nextShareCount,
      })
    } catch (error) {
      console.warn('loadHomeCounts failed', error)
      if (!this.data.problemCount) {
        this.setData({
          problemCount: 0,
          knowledgeCount: 0,
          serviceCount: 0,
          shareCount: 0,
        })
      }
    }
  },

  openEntry(e) {
    if (this.data.navigating) return
    if (Date.now() - this.lastNavigateAt < 320) return
    this.lastNavigateAt = Date.now()
    const id = e.currentTarget.dataset.id
    this.setData({ navigating: true })
    if (id === 'problems') {
      showAppLoading('正在打开')
      wx.navigateTo({
        url: '/pages/problem-library/index',
        complete: () => {
          this.setData({ navigating: false })
          hideAppLoading()
        },
      })
      return
    }
    if (id === 'filament') {
      showAppLoading('正在打开')
      wx.navigateTo({
        url: '/pages/filament/index',
        complete: () => {
          this.setData({ navigating: false })
          hideAppLoading()
        },
      })
      return
    }
    if (id === 'knowledge') {
      showAppLoading('正在打开')
      wx.navigateTo({
        url: '/pages/knowledge/index',
        complete: () => {
          this.setData({ navigating: false })
          hideAppLoading()
        },
      })
      return
    }
    if (id === 'services') {
      showAppLoading('正在打开')
      wx.navigateTo({
        url: '/pages/services/index',
        complete: () => {
          this.setData({ navigating: false })
          hideAppLoading()
        },
      })
      return
    }
    this.setData({ navigating: false })
  },

  async openRecentProblem(e) {
    if (this.data.navigating) return
    if (Date.now() - this.lastNavigateAt < 320) return
    this.lastNavigateAt = Date.now()
    const problemId = e.currentTarget.dataset.problemId
    if (!problemId) return
    const user = await requireLoginForAction('请先登录后查看详情')
    if (!user?.id) return
    this.setData({ navigating: true })
    showAppLoading('正在打开')
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${problemId}`,
      complete: () => {
        this.setData({ navigating: false })
        hideAppLoading()
      },
    })
  },

  onModuleImageError(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index)) return
    this.setData({
      [`moduleImageErrorMap.${index}`]: true,
    })
  },

  onRecentImageError(e) {
    const key = String(e.currentTarget.dataset.key || '').trim()
    if (!key) return
    this.setData({
      [`recentImageErrorMap.${key}`]: true,
    })
  },

  onShareAppMessage() {
    return {
      title: '别塌了模型 | 3D打印排障助手',
      path: '/pages/home/index',
      imageUrl: '/images/home/problem-center.jpg',
    }
  },

  onShareTimeline() {
    return {
      title: '别塌了模型 | 3D打印排障助手',
      query: '',
      imageUrl: '/images/home/problem-center.jpg',
    }
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
