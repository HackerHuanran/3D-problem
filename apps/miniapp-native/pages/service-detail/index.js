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

function extractServiceCloudPath(value = '') {
  const raw = normalizeServiceAsset(value)
  if (!raw || raw.startsWith('wxfile://') || raw.startsWith('http://tmp/') || raw.startsWith('data:image/')) return ''
  let clean = raw.split('?')[0].split('#')[0]
  try {
    clean = decodeURIComponent(clean)
  } catch (error) {}
  const match = clean.match(/(?:^|\/)((?:service-submits|service-submits-qr|studio-services|studio-services-qr)\/[^?#\s]+)/)
  return match?.[1] || ''
}

function toServiceCloudFileID(value = '') {
  const raw = normalizeServiceAsset(value)
  if (!raw) return ''
  if (raw.startsWith('cloud://')) return raw
  const cloudPath = extractServiceCloudPath(raw)
  if (!cloudPath) return ''
  const envId = getApp()?.globalData?.envId || ''
  return envId ? `cloud://${envId}/${cloudPath.replace(/^\/+/, '')}` : ''
}

function buildDetailThumbUrl(url = '', { width = 720, quality = 76 } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/imageMogr2|x-oss-process|x-cos-process/i.test(raw)) return raw
  if (raw.includes('?')) return raw
  const joiner = raw.includes('?') ? '&' : '?'
  return `${raw}${joiner}imageMogr2/thumbnail/${Math.max(1, Number(width) || 720)}x/interlace/1/quality/${Math.max(1, Math.min(100, Number(quality) || 76))}`
}

function normalizeCachedServiceDetail(detail = null) {
  if (!detail) return null
  const imageDisplays = Array.isArray(detail.imageDisplays)
    ? detail.imageDisplays.map((item) => normalizeServiceAsset(item)).filter(Boolean)
    : []
  return {
    ...detail,
    imageDisplays,
    imageThumbDisplays: imageDisplays.map((url) => buildDetailThumbUrl(url, { width: 720, quality: 76 })),
  }
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
    const cachedDetail = normalizeCachedServiceDetail(readServiceDetailCache(id))
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
    const candidates = []
    if (Array.isArray(item.images)) candidates.push(...item.images)
    else candidates.push(item.images)
    candidates.push(item.environmentImage, item.environment_image, item.image_url, item.imageUrl, item.coverImage, item.cover_image)
    return candidates.map((row) => normalizeServiceAsset(row)).filter(Boolean).slice(0, 3)
  },

  async resolveCloudFile(value) {
    const raw = normalizeServiceAsset(value)
    if (!raw) return ''
    const fileID = toServiceCloudFileID(raw)
    if (!fileID) return raw
    const cache = readServiceDetailImageCache()
    const cached = cache[fileID]
    if (cached?.url && cached?.ts && Date.now() - cached.ts <= SERVICE_DETAIL_IMAGE_CACHE_TTL) {
      return cached.url
    }
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [fileID] })
      const nextUrl = res?.fileList?.[0]?.tempFileURL || res?.fileList?.[0]?.tempFileUrl || res?.fileList?.[0]?.download_url || ''
      if (nextUrl) {
        cache[fileID] = {
          ts: Date.now(),
          url: nextUrl,
        }
        writeServiceDetailImageCache(cache)
        return nextUrl
      }
    } catch (error) {
      console.warn('resolve service detail image failed', error)
    }
    const mappedUrls = await this.resolveServiceCloudFilesByFunction([fileID])
    const nextUrl = mappedUrls[fileID] || raw
    if (nextUrl && nextUrl !== raw) {
      cache[fileID] = {
        ts: Date.now(),
        url: nextUrl,
      }
      writeServiceDetailImageCache(cache)
    }
    return nextUrl
  },

  async resolveServiceCloudFilesByFunction(fileList = []) {
    const rows = [...new Set((fileList || []).map((item) => toServiceCloudFileID(item) || normalizeServiceAsset(item)).filter((item) => item.startsWith('cloud://')))]
    if (!rows.length) return {}
    try {
      const res = await wx.cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'resolveServiceFileUrls',
          fileList: rows,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '服务图片解析失败')
      }
      const mappedUrls = { ...(result.urlMap || {}) }
      ;(result.fileList || []).forEach((item) => {
        const fileID = item?.fileID || item?.fileId || ''
        const url = item?.tempFileURL || item?.tempFileUrl || item?.download_url || ''
        if (fileID && url) mappedUrls[fileID] = url
      })
      return mappedUrls
    } catch (error) {
      console.warn('resolve service detail images by function failed', error)
      return {}
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
    const cloudPairs = rows
      .map((item) => ({ raw: item, fileID: toServiceCloudFileID(item) }))
      .filter((item) => item.fileID)
    const cloudRows = [...new Set(cloudPairs.map((item) => item.fileID))]
    const mappedUrls = {}
    if (cloudRows.length) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: cloudRows })
        ;(res?.fileList || []).forEach((item) => {
          const fileID = item?.fileID || item?.fileId || ''
          const url = item?.tempFileURL || item?.tempFileUrl || item?.download_url || ''
          if (fileID && url) {
            mappedUrls[fileID] = url
          }
        })
      } catch (error) {
        console.warn('resolve service detail images batch failed', error)
      }
    }
    const missingRows = cloudRows.filter((item) => !mappedUrls[item])
    if (missingRows.length) {
      Object.assign(mappedUrls, await this.resolveServiceCloudFilesByFunction(missingRows))
    }
    cloudPairs.forEach((item) => {
      if (mappedUrls[item.fileID]) mappedUrls[item.raw] = mappedUrls[item.fileID]
    })
    const results = []
    for (const item of rows) {
      if (mappedUrls[item]) {
        results.push(mappedUrls[item])
        continue
      }
      if (!toServiceCloudFileID(item)) {
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
