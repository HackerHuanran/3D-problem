const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const SERVICE_DETAIL_CACHE_KEY = 'miniapp_service_detail_cache_v1'
const SERVICE_DETAIL_CACHE_TTL = 10 * 60 * 1000
const SERVICE_DETAIL_IMAGE_CACHE_KEY = 'miniapp_service_detail_image_cache_v1'
const SERVICE_DETAIL_IMAGE_CACHE_TTL = 2 * 60 * 60 * 1000

function readServiceDetailCache(id = '') {
  if (!id) return null
  try {
    const cache = wx.getStorageSync(SERVICE_DETAIL_CACHE_KEY) || {}
    const entry = cache[id]
    if (!entry?.ts || Date.now() - entry.ts > SERVICE_DETAIL_CACHE_TTL) return null
    return entry.detail || null
  } catch (error) {
    return null
  }
}

function writeServiceDetailCache(id = '', detail = null) {
  if (!id || !detail) return
  try {
    const cache = wx.getStorageSync(SERVICE_DETAIL_CACHE_KEY) || {}
    cache[id] = {
      ts: Date.now(),
      detail,
    }
    wx.setStorageSync(SERVICE_DETAIL_CACHE_KEY, cache)
  } catch (error) {
    console.warn('writeServiceDetailCache failed', error)
  }
}

function readServiceDetailImageCache() {
  try {
    return wx.getStorageSync(SERVICE_DETAIL_IMAGE_CACHE_KEY) || {}
  } catch (error) {
    return {}
  }
}

function writeServiceDetailImageCache(cache = {}) {
  try {
    wx.setStorageSync(SERVICE_DETAIL_IMAGE_CACHE_KEY, cache)
  } catch (error) {
    console.warn('writeServiceDetailImageCache failed', error)
  }
}

function normalizeServiceAsset(value) {
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
      || value.download_url
      || ''
    ).trim()
  }
  return String(value).trim()
}

function buildDetailThumbUrl(url = '', { width = 720, quality = 76 } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/imageMogr2|x-oss-process|x-cos-process/i.test(raw)) return raw
  const joiner = raw.includes('?') ? '&' : '?'
  return `${raw}${joiner}imageMogr2/thumbnail/${Math.max(1, Number(width) || 720)}x/interlace/1/quality/${Math.max(1, Math.min(100, Number(quality) || 76))}`
}

Page({
  data: {
    id: '',
    loading: true,
    detail: null,
    loadError: '',
    galleryImageErrorMap: {},
  },

  async onLoad(query) {
    const id = query.id || ''
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    const cachedDetail = readServiceDetailCache(id)
    this.setData({
      id,
      detail: cachedDetail,
      loading: !cachedDetail,
      galleryImageErrorMap: {},
    })
    if (!cachedDetail) {
      await this.loadDetail(id)
    }
  },

  async onShow() {
    if (this.data.detail) return
    if (this.data.id) {
      await this.loadDetail(this.data.id)
    }
  },

  async loadDetail(id) {
    if (!id) {
      this.setData({ loading: false, detail: null, loadError: '缺少服务编号' })
      return
    }
    const shouldShowLoading = !this.data.detail
    this.setData({ loading: shouldShowLoading, loadError: '' })
    if (shouldShowLoading) {
      showAppLoading('加载中')
    }
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('studio_services').doc(id).get()
      const detail = await this.normalizeServiceDetail(data || {})
      this.setData({ detail })
      writeServiceDetailCache(id, detail)
    } catch (error) {
      console.warn('load service detail failed', error)
      this.setData({
        detail: null,
        loadError: error?.message || '详情加载失败，请稍后重试',
      })
    } finally {
      this.setData({ loading: false })
      if (shouldShowLoading) {
        hideAppLoading()
      }
    }
  },

  getServiceImages(item = {}) {
    if (Array.isArray(item.images) && item.images.length) {
      return item.images.map((row) => normalizeServiceAsset(row)).filter(Boolean).slice(0, 3)
    }
    if (item.environmentImage) {
      return [normalizeServiceAsset(item.environmentImage)].filter(Boolean)
    }
    return []
  },

  async resolveCloudFile(value) {
    const raw = normalizeServiceAsset(value)
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    const cache = readServiceDetailImageCache()
    const cached = cache[raw]
    if (cached?.url && cached?.ts && Date.now() - cached.ts <= SERVICE_DETAIL_IMAGE_CACHE_TTL) {
      return cached.url
    }
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      const nextUrl = res?.fileList?.[0]?.tempFileURL || res?.fileList?.[0]?.download_url || raw
      cache[raw] = {
        ts: Date.now(),
        url: nextUrl,
      }
      writeServiceDetailImageCache(cache)
      return nextUrl
    } catch (error) {
      console.warn('resolve service detail image failed', error)
      return raw
    }
  },

  async normalizeServiceDetail(item = {}) {
    const images = this.getServiceImages(item)
    const imageDisplays = await this.resolveCloudFiles(images)
    const wechatQrImage = normalizeServiceAsset(item.wechatQrImage)
    const wechatQrImageDisplay = wechatQrImage ? await this.resolveCloudFile(wechatQrImage) : ''
    return {
      id: item._id || '',
      studioName: item.studioName || '',
      machineModel: item.machineModel || '',
      machineCount: item.machineCount || '',
      contact: item.contact || '',
      description: item.description || '',
      imageDisplays,
      imageThumbDisplays: imageDisplays.map((url) => buildDetailThumbUrl(url, { width: 720, quality: 76 })),
      wechatQrImageDisplay,
    }
  },

  async resolveCloudFiles(list = []) {
    const rows = (list || []).map((item) => normalizeServiceAsset(item)).filter(Boolean)
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
        console.warn('resolve service detail images batch failed', error)
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
      results.push(fallbackUrl || '')
    }
    return results
  },
  previewWechatQr() {
    const contact = String(this.data.detail?.contact || '').trim()
    const url = String(this.data.detail?.wechatQrImageDisplay || '').trim()
    if (url) {
      wx.previewImage({
        current: url,
        urls: [url],
      })
      return
    }
    if (!contact) {
      wx.showToast({ title: '暂未填写联系方式', icon: 'none' })
      return
    }
    wx.showModal({
      title: '添加微信',
      content: `微信号：${contact}`,
      confirmText: '复制',
      cancelText: '关闭',
      success: (res) => {
        if (!res.confirm) return
        wx.setClipboardData({
          data: contact,
          success: () => {
            wx.showToast({ title: '微信号已复制', icon: 'success' })
          },
        })
      },
    })
  },

  onGalleryImageError(e) {
    const key = String(e.currentTarget.dataset.key || '').trim()
    if (!key) return
    this.setData({
      [`galleryImageErrorMap.${key}`]: true,
    })
  },

  onShareAppMessage() {
    const detail = this.data.detail || {}
    const title = detail.studioName
      ? `${detail.studioName} | 别塌了模型`
      : '别塌了模型 | 打印服务'
    return {
      title,
      path: `/pages/service-detail/index?id=${this.data.id}`,
      imageUrl: detail.imageDisplays?.[0] || '/images/home/services-workshop.jpg',
    }
  },

  onShareTimeline() {
    const detail = this.data.detail || {}
    const title = detail.studioName
      ? `${detail.studioName} | 别塌了模型`
      : '别塌了模型 | 打印服务'
    return {
      title,
      query: `id=${this.data.id}`,
      imageUrl: detail.imageDisplays?.[0] || '/images/home/services-workshop.jpg',
    }
  },
})
