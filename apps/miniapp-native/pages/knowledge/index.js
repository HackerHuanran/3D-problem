const { showAppLoading, hideAppLoading } = require('../../utils/loading')
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

Page({
  data: {
    query: '',
    insights: [],
    filteredInsights: [],
    loadingInsights: false,
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

  openKnowledgeSubmit() {
    wx.navigateTo({ url: '/pages/knowledge-submit/index' })
  },

  async loadInsights({ force = false } = {}) {
    const db = wx.cloud.database()
    const shouldShowLoading = !this.data.insights.length || force
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
        effectImages: await this.resolveImages(Array.isArray(item.effect_images) ? item.effect_images : []),
      })))
      const normalizedInsights = insights.map((item) => ({
        ...item,
        effectThumbImages: (item.effectImages || []).map((url) => buildKnowledgeThumbUrl(url, { width: 520, quality: 72 })),
      }))
      this.setData({ insights: normalizedInsights })
      this.setData({ filteredInsights: this.filterInsights(normalizedInsights, this.data.query) })
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
