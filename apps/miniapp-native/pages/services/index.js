const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const SERVICES_CACHE_KEY = 'miniapp_services_cache_v1'
const SERVICES_CACHE_TTL = 5 * 60 * 1000
const SERVICE_IMAGE_CACHE_KEY = 'miniapp_service_image_cache_v1'
const SERVICE_IMAGE_CACHE_TTL = 2 * 60 * 60 * 1000

function readServicesCache() {
  try {
    const cache = wx.getStorageSync(SERVICES_CACHE_KEY) || null
    if (!cache?.ts || Date.now() - cache.ts > SERVICES_CACHE_TTL) return null
    return cache
  } catch (error) {
    return null
  }
}

function writeServicesCache(services = []) {
  try {
    wx.setStorageSync(SERVICES_CACHE_KEY, {
      ts: Date.now(),
      services,
    })
  } catch (error) {
    console.warn('writeServicesCache failed', error)
  }
}

function readServiceImageCache() {
  try {
    return wx.getStorageSync(SERVICE_IMAGE_CACHE_KEY) || {}
  } catch (error) {
    return {}
  }
}

function writeServiceImageCache(cache = {}) {
  try {
    wx.setStorageSync(SERVICE_IMAGE_CACHE_KEY, cache)
  } catch (error) {
    console.warn('writeServiceImageCache failed', error)
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

function buildServiceThumbUrl(url = '', { width = 420, quality = 72 } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/imageMogr2|x-oss-process|x-cos-process/i.test(raw)) return raw
  const joiner = raw.includes('?') ? '&' : '?'
  return `${raw}${joiner}imageMogr2/thumbnail/${Math.max(1, Number(width) || 420)}x/interlace/1/quality/${Math.max(1, Math.min(100, Number(quality) || 72))}`
}

Page({
  data: {
    loading: true,
    services: [],
  },

  lastRefreshAt: 0,

  onLoad() {
    wx.hideLoading()
    const cache = readServicesCache()
    if (Array.isArray(cache?.services) && cache.services.length) {
      this.setData({
        loading: false,
        services: cache.services,
      })
    }
  },

  async onShow() {
    const cache = readServicesCache()
    if (Array.isArray(cache?.services) && cache.services.length) {
      this.lastRefreshAt = Date.now()
      return
    }
    if (this.data.services.length && Date.now() - this.lastRefreshAt < SERVICES_CACHE_TTL) {
      return
    }
    await this.loadServices()
  },

  async onPullDownRefresh() {
    try {
      this.lastRefreshAt = 0
      await this.loadServices({ force: true })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onUnload() {
    wx.hideLoading()
  },

  async loadServices({ force = false } = {}) {
    const db = wx.cloud.database()
    const shouldShowLoading = !this.data.services.length || force
    if (shouldShowLoading) {
      this.setData({ loading: true })
      showAppLoading('加载中')
    }
    try {
      const { data } = await db.collection('studio_services')
        .orderBy('updated_at', 'desc')
        .limit(100)
        .get()
      const services = await Promise.all((data || []).map(async (item) => {
        const images = this.normalizeServiceImages(item)
        const imageDisplays = await this.resolveCloudFiles(images)
        const description = String(item.description || '').trim()
        return {
          id: item._id,
          studioName: item.studioName || '',
          machineModel: item.machineModel || '',
          machineCount: item.machineCount || '',
          description,
          briefDescription: description.length > 36 ? `${description.slice(0, 36)}...` : description,
          imageCount: imageDisplays.length,
          coverImageDisplay: imageDisplays[0] || '',
          coverImageThumb: buildServiceThumbUrl(imageDisplays[0] || '', { width: 420, quality: 72 }),
        }
      }))
      this.setData({ services })
      writeServicesCache(services)
      this.lastRefreshAt = Date.now()
    } catch (error) {
      console.warn('load services failed', error)
      this.setData({ services: [] })
      wx.showToast({ title: '打印服务加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      if (shouldShowLoading) {
        hideAppLoading()
      }
    }
  },

  async resolveCloudFile(value) {
    const raw = normalizeServiceAsset(value)
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    const cache = readServiceImageCache()
    const cached = cache[raw]
    if (cached?.url && cached?.ts && Date.now() - cached.ts <= SERVICE_IMAGE_CACHE_TTL) {
      return cached.url
    }
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      const nextUrl = res?.fileList?.[0]?.tempFileURL || res?.fileList?.[0]?.download_url || raw
      cache[raw] = {
        ts: Date.now(),
        url: nextUrl,
      }
      writeServiceImageCache(cache)
      return nextUrl
    } catch (error) {
      console.warn('resolve service image failed', error)
      return raw
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
        console.warn('resolve service image batch failed', error)
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

  normalizeServiceImages(item = {}) {
    if (Array.isArray(item.images) && item.images.length) {
      return item.images.map((row) => normalizeServiceAsset(row)).filter(Boolean).slice(0, 3)
    }
    if (item.environmentImage) {
      return [normalizeServiceAsset(item.environmentImage)].filter(Boolean)
    }
    return []
  },

  openServiceDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    showAppLoading('正在打开')
    wx.navigateTo({
      url: `/pages/service-detail/index?id=${id}`,
      complete: () => {
        hideAppLoading()
      },
    })
  },
})
