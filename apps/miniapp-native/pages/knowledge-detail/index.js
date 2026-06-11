const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const { getCurrentUser, ensureUser, fetchKnowledgeLikeStates, toggleKnowledgeLike, toggleKnowledgeDislike } = require('../../utils/user-service')

const KNOWLEDGE_DETAIL_CACHE_KEY = 'miniapp_knowledge_detail_cache_v1'
const KNOWLEDGE_DETAIL_CACHE_TTL = 5 * 60 * 1000
const KNOWLEDGE_DETAIL_IMAGE_CACHE_KEY = 'miniapp_knowledge_detail_image_cache_v1'
const KNOWLEDGE_DETAIL_IMAGE_CACHE_TTL = 2 * 60 * 60 * 1000

function readDetailCache(id = '') {
  if (!id) return null
  try {
    const cache = wx.getStorageSync(KNOWLEDGE_DETAIL_CACHE_KEY) || {}
    const entry = cache[id]
    if (!entry?.ts || Date.now() - entry.ts > KNOWLEDGE_DETAIL_CACHE_TTL) return null
    return entry.detail || null
  } catch (error) {
    return null
  }
}

function writeDetailCache(id = '', detail = null) {
  if (!id || !detail) return
  try {
    const cache = wx.getStorageSync(KNOWLEDGE_DETAIL_CACHE_KEY) || {}
    cache[id] = {
      ts: Date.now(),
      detail,
    }
    wx.setStorageSync(KNOWLEDGE_DETAIL_CACHE_KEY, cache)
  } catch (error) {
    console.warn('write knowledge detail cache failed', error)
  }
}

function readImageCache() {
  try {
    return wx.getStorageSync(KNOWLEDGE_DETAIL_IMAGE_CACHE_KEY) || {}
  } catch (error) {
    return {}
  }
}

function writeImageCache(cache = {}) {
  try {
    wx.setStorageSync(KNOWLEDGE_DETAIL_IMAGE_CACHE_KEY, cache)
  } catch (error) {
    console.warn('write knowledge detail image cache failed', error)
  }
}

function normalizeAsset(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    return String(
      value.fileID
      || value.fileId
      || value.cloudPath
      || value.cloud_path
      || value.url
      || value.src
      || value.path
      || value.tempFileURL
      || value.tempFileUrl
      || ''
    ).trim()
  }
  return String(value).trim()
}

function buildThumbUrl(url = '', { width = 720, quality = 76 } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/imageMogr2|x-oss-process|x-cos-process/i.test(raw)) return raw
  const joiner = raw.includes('?') ? '&' : '?'
  return `${raw}${joiner}imageMogr2/thumbnail/${Math.max(1, Number(width) || 720)}x/interlace/1/quality/${Math.max(1, Math.min(100, Number(quality) || 76))}`
}

function isDeletedKnowledge(item = {}) {
  const status = String(item.status || '').trim().toLowerCase()
  return item.deleted === true
    || item.is_deleted === true
    || ['deleted', 'removed'].includes(status)
    || item.submission_type !== 'knowledge'
    || status !== 'published'
}

Page({
  data: {
    id: '',
    loading: true,
    detail: null,
    loadError: '',
    currentUser: null,
    reactionLoading: false,
  },

  async onLoad(query) {
    const id = String(query?.id || '').trim()
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    const cachedDetail = readDetailCache(id)
    this.setData({
      id,
      detail: cachedDetail,
      loading: !cachedDetail,
    })
    this.loadCurrentUserAndLike(id)
    if (!cachedDetail) {
      await this.loadDetail(id)
    }
  },

  async onPullDownRefresh() {
    try {
      await this.loadDetail(this.data.id, { force: true })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  async onShow() {
    if (!this.data.id || !this.data.detail) return
    await this.loadCurrentUserAndLike(this.data.id)
  },

  async loadDetail(id, { force = false } = {}) {
    if (!id) {
      this.setData({ loading: false, detail: null, loadError: '缺少知识编号' })
      return
    }
    const shouldShowLoading = force || !this.data.detail
    this.setData({ loading: shouldShowLoading, loadError: '' })
    if (shouldShowLoading) showAppLoading('加载中')
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('user_problems').doc(id).get()
      if (!data || isDeletedKnowledge(data)) {
        throw new Error('当前知识不存在或未审核通过')
      }
      const detail = await this.normalizeDetail(data)
      this.setData({ detail })
      writeDetailCache(id, detail)
      await this.loadCurrentUserAndLike(id)
    } catch (error) {
      console.warn('load knowledge detail failed', error)
      this.setData({
        detail: null,
        loadError: error?.message || '详情加载失败，请稍后重试',
      })
    } finally {
      this.setData({ loading: false })
      if (shouldShowLoading) hideAppLoading()
    }
  },

  async loadCurrentUserAndLike(id = this.data.id) {
    if (!id) return
    try {
      const user = await getCurrentUser()
      const { counts, likedIds, dislikeCounts, dislikedIds } = await fetchKnowledgeLikeStates(user?.id || '', [id])
      const likedSet = new Set(likedIds || [])
      const dislikedSet = new Set(dislikedIds || [])
      this.setData({
        currentUser: user,
        detail: this.data.detail
          ? {
              ...this.data.detail,
              likeCount: Number(counts?.[id] ?? this.data.detail.likeCount ?? 0),
              liked: likedSet.has(id),
              dislikeCount: Number(dislikeCounts?.[id] ?? this.data.detail.dislikeCount ?? 0),
              disliked: dislikedSet.has(id),
            }
          : this.data.detail,
      })
    } catch (error) {
      console.warn('load knowledge detail like failed', error)
    }
  },

  async toggleKnowledgeLike() {
    const id = this.data.id
    if (!id || this.data.reactionLoading) return
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
    this.setData({ reactionLoading: true })
    try {
      const result = await toggleKnowledgeLike(user.id, id)
      const detail = this.data.detail || {}
      const nextDetail = {
        ...detail,
        liked: result.liked,
        likeCount: result.count,
        disliked: result.disliked,
        dislikeCount: result.dislikeCount,
      }
      this.setData({ detail: nextDetail })
      writeDetailCache(id, nextDetail)
      wx.showToast({ title: result.liked ? '已点赞' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle knowledge detail like failed', error)
      wx.showToast({ title: '点赞失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ reactionLoading: false })
    }
  },

  async toggleKnowledgeDislike() {
    const id = this.data.id
    if (!id || this.data.reactionLoading) return
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
    this.setData({ reactionLoading: true })
    try {
      const result = await toggleKnowledgeDislike(user.id, id)
      const detail = this.data.detail || {}
      const nextDetail = {
        ...detail,
        liked: result.liked,
        likeCount: result.count,
        disliked: result.disliked,
        dislikeCount: result.dislikeCount,
      }
      this.setData({ detail: nextDetail })
      writeDetailCache(id, nextDetail)
      wx.showToast({ title: result.disliked ? '已标记' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle knowledge detail dislike failed', error)
      wx.showToast({ title: '操作失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ reactionLoading: false })
    }
  },

  async normalizeDetail(item = {}) {
    const rawBlocks = Array.isArray(item.detail_blocks) && item.detail_blocks.length
      ? item.detail_blocks
      : [{ text: item.description || '', images: [] }]
    const blocks = []
    for (const block of rawBlocks) {
      const images = await this.resolveCloudFiles(block.images || [])
      blocks.push({
        text: String(block.text || '').trim(),
        images,
        imageRows: images.map((url) => ({
          url,
          thumbUrl: buildThumbUrl(url, { width: 720, quality: 76 }),
        })),
      })
    }
    const effectImages = await this.resolveCloudFiles(item.effect_images || [])
    return {
      id: item._id || '',
      title: item.title || '',
      subtitle: item.subtitle || '',
      description: item.description || '',
      blocks: blocks.filter((block) => block.text || block.images.length),
      effectImages,
      effectImageRows: effectImages.map((url) => ({
        url,
        thumbUrl: buildThumbUrl(url, { width: 720, quality: 76 }),
      })),
      likeCount: Number(item.likeCount || 0),
      liked: !!item.liked,
      dislikeCount: Number(item.dislikeCount || 0),
      disliked: !!item.disliked,
    }
  },

  async resolveCloudFile(value) {
    const raw = normalizeAsset(value)
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    const cache = readImageCache()
    const cached = cache[raw]
    if (cached?.url && cached?.ts && Date.now() - cached.ts <= KNOWLEDGE_DETAIL_IMAGE_CACHE_TTL) {
      return cached.url
    }
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      const nextUrl = res?.fileList?.[0]?.tempFileURL || raw
      cache[raw] = {
        ts: Date.now(),
        url: nextUrl,
      }
      writeImageCache(cache)
      return nextUrl
    } catch (error) {
      console.warn('resolve knowledge detail image failed', error)
      return raw
    }
  },

  async resolveCloudFiles(list = []) {
    const rows = (list || []).map((item) => normalizeAsset(item)).filter(Boolean)
    if (!rows.length) return []
    const cloudRows = rows.filter((item) => item.startsWith('cloud://'))
    const mappedUrls = {}
    if (cloudRows.length) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: cloudRows })
        ;(res?.fileList || []).forEach((item) => {
          if (item?.fileID) {
            mappedUrls[item.fileID] = item.tempFileURL || item.fileID
          }
        })
      } catch (error) {
        console.warn('resolve knowledge detail images batch failed', error)
      }
    }
    const results = []
    for (const item of rows) {
      if (mappedUrls[item]) {
        results.push(mappedUrls[item])
        continue
      }
      if (!item.startsWith('cloud://')) {
        results.push(item)
        continue
      }
      const fallbackUrl = await this.resolveCloudFile(item)
      if (fallbackUrl) results.push(fallbackUrl)
    }
    return results
  },

  previewImage(e) {
    const list = e.currentTarget.dataset.list || []
    const current = String(e.currentTarget.dataset.current || '').trim()
    const urls = Array.isArray(list) ? list.filter(Boolean) : []
    if (!urls.length) return
    wx.previewImage({
      current: current && urls.includes(current) ? current : urls[0],
      urls,
    })
  },

  onShareAppMessage() {
    const detail = this.data.detail || {}
    return {
      title: detail.title ? `${detail.title} | 别塌了模型` : '别塌了模型 | 知识库',
      path: `/pages/knowledge-detail/index?id=${this.data.id}`,
      imageUrl: detail.effectImages?.[0] || '/images/home/knowledge-library.jpg',
    }
  },

  onShareTimeline() {
    const detail = this.data.detail || {}
    return {
      title: detail.title ? `${detail.title} | 别塌了模型` : '别塌了模型 | 知识库',
      query: `id=${this.data.id}`,
      imageUrl: detail.effectImages?.[0] || '/images/home/knowledge-library.jpg',
    }
  },
})
