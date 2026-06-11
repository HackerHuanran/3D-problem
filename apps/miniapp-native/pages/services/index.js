const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const { requireLoginForAction } = require('../../utils/user-service')
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

function normalizeCachedServices(services = []) {
  return (Array.isArray(services) ? services : []).map((item) => {
    const coverImageDisplay = normalizeServiceAsset(item.coverImageDisplay)
    return {
      ...item,
      coverImageDisplay,
      coverImageThumb: buildServiceThumbUrl(coverImageDisplay || item.coverImageThumb || '', { width: 420, quality: 72 }),
    }
  })
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

function buildServiceThumbUrl(url = '', { width = 420, quality = 72 } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/imageMogr2|x-oss-process|x-cos-process/i.test(raw)) return raw
  if (raw.includes('?')) return raw
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
      const services = normalizeCachedServices(cache.services)
      this.setData({
        loading: false,
        services,
      })
    }
  },

  async onShow() {
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
    const fileID = toServiceCloudFileID(raw)
    if (!fileID) return raw
    const cache = readServiceImageCache()
    const cached = cache[fileID]
    if (cached?.url && cached?.ts && Date.now() - cached.ts <= SERVICE_IMAGE_CACHE_TTL) {
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
        writeServiceImageCache(cache)
        return nextUrl
      }
    } catch (error) {
      console.warn('resolve service image failed', error)
    }
    const mappedUrls = await this.resolveServiceCloudFilesByFunction([fileID])
    const nextUrl = mappedUrls[fileID] || raw
    if (nextUrl && nextUrl !== raw) {
      cache[fileID] = {
        ts: Date.now(),
        url: nextUrl,
      }
      writeServiceImageCache(cache)
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
      console.warn('resolve service images by function failed', error)
      return {}
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
        console.warn('resolve service image batch failed', error)
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

  normalizeServiceImages(item = {}) {
    const candidates = []
    if (Array.isArray(item.images)) candidates.push(...item.images)
    else candidates.push(item.images)
    candidates.push(item.environmentImage, item.environment_image, item.image_url, item.imageUrl, item.coverImage, item.cover_image)
    return candidates.map((row) => normalizeServiceAsset(row)).filter(Boolean).slice(0, 3)
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

  async openServiceSubmit() {
    const user = await requireLoginForAction('请先登录后入驻服务')
    if (!user?.id) return
    showAppLoading('正在打开')
    wx.navigateTo({
      url: '/pages/service-submit/index',
      complete: () => {
        hideAppLoading()
      },
    })
  },
})
