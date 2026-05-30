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
    filteredSections: [],
    insights: [],
    loadingInsights: false,
    sections: [
      {
        id: 'starter',
        title: '入门基础',
        desc: '先理解调平、首层、温度和速度这些最常见概念。',
        items: ['为什么第一层最重要', '什么情况下先调平再改切片', '新手最容易忽略的 3 个参数'],
      },
      {
        id: 'params',
        title: '参数解释',
        desc: '把喷嘴温度、热床温度、打印速度、层高和回抽讲清楚。',
        items: ['喷嘴温度高低分别会带来什么现象', '回抽距离和回抽速度怎么理解', '层高为什么会影响表面和时间'],
      },
      {
        id: 'maintenance',
        title: '维护常识',
        desc: '喷嘴清理、热床清洁、耗材保存和日常检查。',
        items: ['多久该清一次热床', '喷嘴堵了先排查什么', '耗材为什么一定要防潮'],
      },
      {
        id: 'troubleshooting',
        title: '常见故障',
        desc: '围绕翘边、拉丝、堵嘴和层移做快速判断。',
        items: ['翘边先看热床和环境风', '拉丝优先检查回抽和温度', '堵嘴要排查喷嘴和耗材'],
      },
    ],
  },

  onLoad() {
    wx.hideLoading()
    wx.showLoading({ title: '正在加载' })
    try {
      this.setData({ filteredSections: this.data.sections })
    } finally {
      wx.hideLoading()
    }
    const cache = readInsightsCache()
    if (Array.isArray(cache?.insights) && cache.insights.length) {
      this.setData({ insights: cache.insights })
    }
    this.loadInsights()
  },

  onSearchInput(e) {
    const query = String(e.detail.value || '').trim()
    const q = query.toLowerCase()
    const filteredSections = !q
      ? this.data.sections
      : this.data.sections
        .map((section) => {
          const items = (section.items || []).filter((item) => String(item).toLowerCase().includes(q))
          const matchSection = String(section.title + section.desc).toLowerCase().includes(q)
          if (!items.length && !matchSection) return null
          return { ...section, items: items.length ? items : section.items }
        })
        .filter(Boolean)

    this.setData({ query, filteredSections })
  },

  openKnowledgeSubmit() {
    wx.navigateTo({ url: '/pages/knowledge-submit/index' })
  },

  async loadInsights() {
    const db = wx.cloud.database()
    if (!this.data.insights.length) {
      this.setData({ loadingInsights: true })
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
      writeInsightsCache(normalizedInsights)
    } catch (error) {
      console.warn('loadInsights failed', error)
      this.setData({ insights: [] })
    } finally {
      this.setData({ loadingInsights: false })
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
