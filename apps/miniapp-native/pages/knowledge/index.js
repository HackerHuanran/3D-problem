const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const { getCurrentUser, ensureUser, requireLoginForAction, fetchKnowledgeLikeStates, toggleKnowledgeLike, toggleKnowledgeDislike } = require('../../utils/user-service')
const KNOWLEDGE_INSIGHTS_CACHE_KEY = 'miniapp_knowledge_insights_v1'
const KNOWLEDGE_INSIGHTS_CACHE_TTL = 5 * 60 * 1000
const KNOWLEDGE_IMAGE_CACHE_KEY = 'miniapp_knowledge_image_cache_v1'
const KNOWLEDGE_IMAGE_CACHE_TTL = 2 * 60 * 60 * 1000

function readInsightsCache() {
  try {
    const cache = wx.getStorageSync(KNOWLEDGE_INSIGHTS_CACHE_KEY) || null
    if (!cache?.ts || Date.now() - cache.ts > KNOWLEDGE_INSIGHTS_CACHE_TTL) return null
    return cache
  } catch (error) {
    return null
  }
}

function writeInsightsCache(insights = []) {
  try {
    wx.setStorageSync(KNOWLEDGE_INSIGHTS_CACHE_KEY, {
      ts: Date.now(),
      insights,
    })
  } catch (error) {
    console.warn('writeInsightsCache failed', error)
  }
}

function readKnowledgeImageCache() {
  try {
    return wx.getStorageSync(KNOWLEDGE_IMAGE_CACHE_KEY) || {}
  } catch (error) {
    return {}
  }
}

function writeKnowledgeImageCache(cache = {}) {
  try {
    wx.setStorageSync(KNOWLEDGE_IMAGE_CACHE_KEY, cache)
  } catch (error) {
    console.warn('writeKnowledgeImageCache failed', error)
  }
}

function buildKnowledgeThumbUrl(url = '', { width = 520, quality = 72 } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/imageMogr2|x-oss-process|x-cos-process/i.test(raw)) return raw
  const joiner = raw.includes('?') ? '&' : '?'
  return `${raw}${joiner}imageMogr2/thumbnail/${Math.max(1, Number(width) || 520)}x/interlace/1/quality/${Math.max(1, Math.min(100, Number(quality) || 72))}`
}

function getTimeValue(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value && typeof value.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function formatPublishDate(item = {}) {
  const timestamp = getTimeValue(item.updated_at || item.created_at || item.updatedAt || item.createdAt)
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

Page({
  data: {
    query: '',
    insights: [],
    filteredInsights: [],
    loadingInsights: false,
    currentUser: null,
    likeLoadingMap: {},
  },

  onLoad() {
    const cache = readInsightsCache()
    if (Array.isArray(cache?.insights) && cache.insights.length) {
      this.setData({
        insights: cache.insights,
        filteredInsights: this.filterInsights(cache.insights, this.data.query),
      })
    }
    this.loadInsights()
    this.loadCurrentUser()
  },

  async onShow() {
    await this.loadInsights({ force: true, silent: true })
    if (!this.data.insights.length) return
    await this.refreshLikeStates()
  },

  async onPullDownRefresh() {
    try {
      await this.loadInsights({ force: true })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onSearchInput(e) {
    const query = String(e.detail.value || '').trim()
    this.setData({
      query,
      filteredInsights: this.filterInsights(this.data.insights, query),
    })
  },

  filterInsights(insights = [], query = '') {
    const q = String(query || '').trim().toLowerCase()
    if (!q) return insights || []
    return (insights || []).filter((item) => {
      return String(`${item.title || ''} ${item.subtitle || ''}`).toLowerCase().includes(q)
    })
  },

  async openKnowledgeSubmit() {
    const user = await requireLoginForAction('请先登录后分享知识')
    if (!user?.id) return
    wx.navigateTo({ url: '/pages/knowledge-submit/index' })
  },

  openKnowledgeDetail(e) {
    const id = String(e.currentTarget.dataset.id || '').trim()
    if (!id) return
    wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` })
  },

  async loadCurrentUser() {
    try {
      const user = await getCurrentUser()
      this.setData({ currentUser: user })
      if (user?.id && this.data.insights.length) {
        await this.attachLikeStates(this.data.insights, user.id)
      }
    } catch (error) {
      console.warn('load knowledge current user failed', error)
    }
  },

  async refreshLikeStates() {
    try {
      let user = this.data.currentUser
      if (!user?.id) {
        user = await getCurrentUser()
        this.setData({ currentUser: user })
      }
      await this.attachLikeStates(this.data.insights, user?.id || '')
    } catch (error) {
      console.warn('refresh knowledge likes failed', error)
    }
  },

  async attachLikeStates(insights = [], userId = '') {
    const ids = (insights || []).map((item) => item.id).filter(Boolean)
    if (!ids.length) return insights
    const { counts, likedIds, dislikeCounts, dislikedIds } = await fetchKnowledgeLikeStates(userId, ids)
    const likedSet = new Set(likedIds || [])
    const dislikedSet = new Set(dislikedIds || [])
    const nextInsights = (insights || []).map((item) => ({
      ...item,
      likeCount: Number(counts?.[item.id] ?? item.likeCount ?? 0),
      liked: likedSet.has(item.id),
      dislikeCount: Number(dislikeCounts?.[item.id] ?? item.dislikeCount ?? 0),
      disliked: dislikedSet.has(item.id),
    }))
    this.setData({
      insights: nextInsights,
      filteredInsights: this.filterInsights(nextInsights, this.data.query),
    })
    writeInsightsCache(nextInsights)
    return nextInsights
  },

  async toggleKnowledgeLike(e) {
    const id = String(e.currentTarget.dataset.id || '').trim()
    if (!id || this.data.likeLoadingMap[id]) return
    let user = this.data.currentUser
    if (!user?.id) {
      try {
        user = await ensureUser()
        this.setData({ currentUser: user })
      } catch (error) {
        wx.showToast({ title: '请先登录后点赞', icon: 'none' })
        return
      }
    }
    if (!user?.id) {
      wx.showToast({ title: '请先登录后点赞', icon: 'none' })
      return
    }
    this.setData({ [`likeLoadingMap.${id}`]: true })
    try {
      const result = await toggleKnowledgeLike(user.id, id)
      const nextInsights = (this.data.insights || []).map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          liked: result.liked,
          likeCount: result.count,
          disliked: result.disliked,
          dislikeCount: result.dislikeCount,
        }
      })
      this.setData({
        insights: nextInsights,
        filteredInsights: this.filterInsights(nextInsights, this.data.query),
      })
      writeInsightsCache(nextInsights)
      wx.showToast({ title: result.liked ? '已点赞' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle knowledge like failed', error)
      wx.showToast({ title: '点赞失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ [`likeLoadingMap.${id}`]: false })
    }
  },

  async toggleKnowledgeDislike(e) {
    const id = String(e.currentTarget.dataset.id || '').trim()
    if (!id || this.data.likeLoadingMap[id]) return
    let user = this.data.currentUser
    if (!user?.id) {
      try {
        user = await ensureUser()
        this.setData({ currentUser: user })
      } catch (error) {
        wx.showToast({ title: '请先登录后操作', icon: 'none' })
        return
      }
    }
    if (!user?.id) {
      wx.showToast({ title: '请先登录后操作', icon: 'none' })
      return
    }
    this.setData({ [`likeLoadingMap.${id}`]: true })
    try {
      const result = await toggleKnowledgeDislike(user.id, id)
      const nextInsights = (this.data.insights || []).map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          liked: result.liked,
          likeCount: result.count,
          disliked: result.disliked,
          dislikeCount: result.dislikeCount,
        }
      })
      this.setData({
        insights: nextInsights,
        filteredInsights: this.filterInsights(nextInsights, this.data.query),
      })
      writeInsightsCache(nextInsights)
      wx.showToast({ title: result.disliked ? '已标记' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle knowledge dislike failed', error)
      wx.showToast({ title: '操作失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ [`likeLoadingMap.${id}`]: false })
    }
  },

  async loadInsights({ force = false, silent = false } = {}) {
    const db = wx.cloud.database()
    const shouldShowLoading = !silent && (!this.data.insights.length || force)
    if (shouldShowLoading) {
      this.setData({ loadingInsights: true })
      showAppLoading('加载中')
    }
    try {
      const { data } = await db.collection('user_problems')
        .where({
          submission_type: 'knowledge',
          status: 'published',
        })
        .orderBy('updated_at', 'desc')
        .limit(20)
        .get()

      const insights = await Promise.all((data || []).map(async (item) => ({
        id: item._id,
        title: item.title || '',
        subtitle: item.subtitle || '',
        publishDateText: formatPublishDate(item),
        effectImages: await this.resolveImages(Array.isArray(item.effect_images) ? item.effect_images : []),
      })))
      let normalizedInsights = insights.map((item) => ({
        ...item,
        effectThumbImages: (item.effectImages || []).map((url) => buildKnowledgeThumbUrl(url, { width: 520, quality: 72 })),
        coverThumbImage: (item.effectImages || [])[0]
          ? buildKnowledgeThumbUrl((item.effectImages || [])[0], { width: 620, quality: 74 })
          : '',
        likeCount: Number(item.likeCount || 0),
        liked: !!item.liked,
        dislikeCount: Number(item.dislikeCount || 0),
        disliked: !!item.disliked,
      }))
      normalizedInsights = await this.attachLikeStates(normalizedInsights, this.data.currentUser?.id || '')
      if (!normalizedInsights.length) {
        this.setData({ insights: [], filteredInsights: [] })
      }
      writeInsightsCache(normalizedInsights)
    } catch (error) {
      console.warn('loadInsights failed', error)
      this.setData({
        insights: [],
        filteredInsights: [],
      })
    } finally {
      this.setData({ loadingInsights: false })
      if (shouldShowLoading) {
        hideAppLoading()
      }
    }
  },

  async resolveImages(list = []) {
    const rows = (list || []).map((item) => String(item || '').trim()).filter(Boolean)
    if (!rows.length) return []
    const cloudRows = rows.filter((item) => item.startsWith('cloud://'))
    const mapped = {}
    if (cloudRows.length) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: cloudRows })
        ;(res?.fileList || []).forEach((item) => {
          if (item?.fileID) {
            mapped[item.fileID] = item.tempFileURL || item.fileID
          }
        })
      } catch (error) {
        console.warn('resolve knowledge images failed', error)
      }
    }
    const results = []
    for (const item of rows) {
      if (mapped[item]) {
        results.push(mapped[item])
        continue
      }
      if (!item.startsWith('cloud://')) {
        results.push(item)
        continue
      }
      try {
        const cache = readKnowledgeImageCache()
        const cached = cache[item]
        if (cached?.url && cached?.ts && Date.now() - cached.ts <= KNOWLEDGE_IMAGE_CACHE_TTL) {
          results.push(cached.url)
          continue
        }
        const res = await wx.cloud.getTempFileURL({ fileList: [item] })
        const nextUrl = res?.fileList?.[0]?.tempFileURL || item
        cache[item] = {
          ts: Date.now(),
          url: nextUrl,
        }
        writeKnowledgeImageCache(cache)
        results.push(nextUrl)
      } catch (error) {
        results.push(item)
      }
    }
    return results
  },
})
