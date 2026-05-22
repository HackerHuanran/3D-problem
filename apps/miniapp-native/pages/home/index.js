const { getCurrentUser } = require('../../utils/user-service')
const { getProblemCount, getProblemDetail, listProblems } = require('../../utils/problem-service')
const HOME_CACHE_KEY = 'miniapp_home_cache_v1'
const HOME_CACHE_TTL = 2 * 60 * 1000

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
    ],
  },

  onLoad() {
    const cache = getHomeCache()
    if (!cache) return
    this.setData({
      problemCount: Number(cache.problemCount) || 0,
      recentProblems: cache.recentProblems || [],
      featuredProblems: cache.featuredProblems || [],
    })
  },

  async onShow() {
    await Promise.all([
      this.loadRecentProblems(),
      this.loadProblemCount(),
      this.loadFeaturedProblems(),
    ])
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
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('problem_history')
        .where({ user_id: user.id })
        .orderBy('viewed_at', 'desc')
        .limit(10)
        .get()
      const rows = data || []
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
        return {
          id: historyItem._id || `${historyItem.problem_id || 'recent'}-${index}`,
          problemId: doc.id,
          title: doc.title || '',
          subtitle: doc.subtitle || '',
          category: doc.category || '',
          image_url: doc.image_url || '',
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
