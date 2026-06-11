const { requireLoginForAction } = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const SERVICES_CACHE_KEY = 'miniapp_services_cache_v1'
const SERVICE_DETAIL_CACHE_KEY = 'miniapp_service_detail_cache_v1'
const SERVICE_IMAGE_CACHE_KEY = 'miniapp_service_image_cache_v1'
const SERVICE_DETAIL_IMAGE_CACHE_KEY = 'miniapp_service_detail_image_cache_v1'

function normalizeAsset(value = '') {
  if (!value) return ''
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
  return String(value || '').trim()
}

function isLocalTempAsset(value = '') {
  const raw = normalizeAsset(value)
  return raw.startsWith('wxfile://') || raw.startsWith('http://tmp/')
}

function isUploadedAsset(value = '') {
  const raw = normalizeAsset(value)
  if (!raw) return false
  if (raw.startsWith('cloud://')) return true
  if (/^https?:\/\//i.test(raw) && !isLocalTempAsset(raw)) return true
  return false
}

function getUploadExt(filePath = '') {
  const cleanPath = normalizeAsset(filePath).split('?')[0].split('#')[0]
  const match = cleanPath.match(/\.([a-z0-9]+)$/i)
  const ext = String(match?.[1] || 'jpg').toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext) ? ext : 'jpg'
}

function extractServiceCloudPath(value = '') {
  const raw = normalizeAsset(value)
  if (!raw || raw.startsWith('wxfile://') || raw.startsWith('http://tmp/') || raw.startsWith('data:image/')) return ''
  let clean = raw.split('?')[0].split('#')[0]
  try {
    clean = decodeURIComponent(clean)
  } catch (error) {}
  const match = clean.match(/(?:^|\/)((?:service-submits|service-submits-qr|studio-services|studio-services-qr)\/[^?#\s]+)/)
  return match?.[1] || ''
}

function toServiceCloudFileID(value = '') {
  const raw = normalizeAsset(value)
  if (!raw) return ''
  if (raw.startsWith('cloud://')) return raw
  const cloudPath = extractServiceCloudPath(raw)
  if (!cloudPath) return ''
  const envId = getApp()?.globalData?.envId || ''
  return envId ? `cloud://${envId}/${cloudPath.replace(/^\/+/, '')}` : ''
}

function clearServiceCaches() {
  try {
    wx.removeStorageSync(SERVICES_CACHE_KEY)
    wx.removeStorageSync(SERVICE_DETAIL_CACHE_KEY)
    wx.removeStorageSync(SERVICE_IMAGE_CACHE_KEY)
    wx.removeStorageSync(SERVICE_DETAIL_IMAGE_CACHE_KEY)
  } catch (error) {
    console.warn('clear service caches failed', error)
  }
}

Page({
  data: {
    submissionId: '',
    serviceId: '',
    userId: '',
    pageTitle: '打印服务入驻',
    studioName: '',
    machineModel: '',
    machineCount: '',
    description: '',
    contact: '',
    images: [],
    imageDisplays: [],
    wechatQrImage: '',
    wechatQrImageDisplay: '',
    submitting: false,
  },

  normalizeImageList(list = []) {
    return (Array.isArray(list) ? list : [])
      .map((item) => normalizeAsset(item))
      .filter(Boolean)
      .slice(0, 3)
  },

  async resolveServiceCloudFilesByFunction(fileList = []) {
    const rows = [...new Set((fileList || []).map((item) => toServiceCloudFileID(item) || normalizeAsset(item)).filter((item) => item.startsWith('cloud://')))]
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
      console.warn('resolve service submit images by function failed', error)
      return {}
    }
  },

  async resolveDisplayImages(list = []) {
    const rows = this.normalizeImageList(list)
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
          if (fileID && url) mappedUrls[fileID] = url
        })
      } catch (error) {
        console.warn('resolve service submit images failed', error)
      }
      const missingRows = cloudRows.filter((item) => !mappedUrls[item])
      if (missingRows.length) {
        Object.assign(mappedUrls, await this.resolveServiceCloudFilesByFunction(missingRows))
      }
    }
    cloudPairs.forEach((item) => {
      if (mappedUrls[item.fileID]) mappedUrls[item.raw] = mappedUrls[item.fileID]
    })
    return rows.map((item) => mappedUrls[item] || item)
  },

  async resolveDisplayImage(value = '') {
    const raw = normalizeAsset(value)
    if (!raw) return ''
    if (!toServiceCloudFileID(raw)) return raw
    const displays = await this.resolveDisplayImages([raw])
    return displays[0] || raw
  },

  async onLoad(query) {
    wx.hideLoading()
    const user = await requireLoginForAction('请先登录后入驻服务')
    if (!user?.id) return

    const db = wx.cloud.database()
    const serviceId = query?.serviceId || ''
    if (serviceId) {
      showAppLoading('加载中')
      try {
        const { data } = await db.collection('studio_services').doc(serviceId).get()
        const item = data || {}
        const images = this.normalizeImageList(item.images)
        const wechatQrImage = normalizeAsset(item.wechatQrImage)
        const imageDisplays = await this.resolveDisplayImages(images)
        const wechatQrImageDisplay = await this.resolveDisplayImage(wechatQrImage)
        this.setData({
          serviceId,
          pageTitle: '修改打印服务',
          studioName: item.studioName || '',
          machineModel: item.machineModel || '',
          machineCount: item.machineCount || '',
          description: item.description || '',
          contact: item.contact || '',
          images: images.slice(0, 3),
          imageDisplays,
          wechatQrImage,
          wechatQrImageDisplay,
        })
        wx.setNavigationBarTitle({ title: '修改打印服务' })
      } catch (error) {
        console.warn('load published service failed', error)
        wx.showToast({ title: '服务加载失败', icon: 'none' })
      } finally {
        hideAppLoading()
      }
      return
    }

    const submissionId = query?.id || ''
    if (!submissionId) return

    showAppLoading('加载中')
    try {
      const { data } = await db.collection('user_problems').where({ _id: submissionId }).limit(1).get()
      const item = data?.[0]
      if (!item || item.deleted === true || item.is_deleted === true || ['deleted', 'removed'].includes(String(item.status || '').trim().toLowerCase())) {
        wx.showToast({ title: '投稿已被删除', icon: 'none' })
        setTimeout(() => {
          wx.navigateBack({ delta: 1 })
        }, 600)
        return
      }
      const service = item.service || {}
      const images = this.normalizeImageList(service.images || item.images)
      const wechatQrImage = normalizeAsset(service.wechatQrImage || item.wechatQrImage)
      const imageDisplays = await this.resolveDisplayImages(images)
      const wechatQrImageDisplay = await this.resolveDisplayImage(wechatQrImage)
      this.setData({
        submissionId,
        userId: item.user_id || '',
        pageTitle: '修改服务入驻',
        studioName: service.studioName || item.studioName || item.title || '',
        machineModel: service.machineModel || item.machineModel || '',
        machineCount: service.machineCount || item.machineCount || '',
        description: service.description || item.description || '',
        contact: service.contact || item.contact || '',
        images: images.slice(0, 3),
        imageDisplays,
        wechatQrImage,
        wechatQrImageDisplay,
      })
      wx.setNavigationBarTitle({ title: '修改服务入驻' })
    } catch (error) {
      console.warn('load service submission failed', error)
    } finally {
      hideAppLoading()
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({
      [field]: e.detail.value,
    })
  },

  chooseImages() {
    const current = this.data.images || []
    const remain = 3 - current.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 3 张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean)
        if (!files.length) return
        this.setData({
          images: current.concat(files).slice(0, 3),
          imageDisplays: (this.data.imageDisplays || []).concat(files).slice(0, 3),
        })
      },
    })
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index)) return
    const images = [...(this.data.images || [])]
    const imageDisplays = [...(this.data.imageDisplays || [])]
    images.splice(index, 1)
    imageDisplays.splice(index, 1)
    this.setData({ images, imageDisplays })
  },

  chooseWechatQrImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (!file) return
        this.setData({
          wechatQrImage: file,
          wechatQrImageDisplay: file,
        })
      },
    })
  },

  clearWechatQrImage() {
    this.setData({
      wechatQrImage: '',
      wechatQrImageDisplay: '',
    })
  },

  async uploadImage(filePath, folder) {
    const raw = normalizeAsset(filePath)
    if (!raw) return ''
    if (isUploadedAsset(raw)) return raw
    const ext = getUploadExt(raw)
    const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const upload = await wx.cloud.uploadFile({
      cloudPath,
      filePath: raw,
    })
    return upload.fileID || ''
  },

  async submit() {
    if (this.data.submitting) return
    const user = await requireLoginForAction(this.data.submissionId || this.data.serviceId ? '请先登录后保存' : '请先登录后入驻服务')
    if (!user?.id) return

    const studioName = normalizeAsset(this.data.studioName)
    const machineModel = normalizeAsset(this.data.machineModel)
    const machineCount = normalizeAsset(this.data.machineCount)
    const description = normalizeAsset(this.data.description)
    const contact = normalizeAsset(this.data.contact)

    if (!studioName || !machineModel || !machineCount || !description) {
      wx.showToast({ title: '请完整填写服务信息', icon: 'none' })
      return
    }
    if (!contact && !this.data.wechatQrImage) {
      wx.showToast({ title: '请填写微信号或上传二维码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    showAppLoading(this.data.submissionId || this.data.serviceId ? '保存中' : '提交中')
    try {
      const db = wx.cloud.database()
      const uploadedImages = []
      for (const image of this.data.images || []) {
        const fileID = await this.uploadImage(image, 'service-submits')
        if (fileID) uploadedImages.push(fileID)
      }
      const wechatQrImage = this.data.wechatQrImage
        ? await this.uploadImage(this.data.wechatQrImage, 'service-submits-qr')
        : ''
      const service = {
        studioName,
        machineModel,
        machineCount,
        contact,
        description,
        images: uploadedImages.slice(0, 3),
        environmentImage: uploadedImages[0] || '',
        wechatQrImage,
      }
      if (this.data.serviceId) {
        await db.collection('studio_services').doc(this.data.serviceId).update({
          data: {
            ...service,
            source: 'admin_edited',
            updated_at: db.serverDate(),
          },
        })
        wx.showToast({ title: '保存成功', icon: 'success' })
        clearServiceCaches()
        setTimeout(() => {
          wx.navigateBack()
        }, 600)
        return
      }

      const payload = {
        user_id: this.data.userId || user.id,
        title: studioName,
        subtitle: `${machineModel} · ${machineCount}`,
        description,
        image_url: uploadedImages[0] || '',
        service,
        studioName,
        machineModel,
        machineCount,
        contact,
        images: uploadedImages.slice(0, 3),
        environmentImage: uploadedImages[0] || '',
        wechatQrImage,
        category: '打印服务',
        submission_type: 'service',
        status: 'pending',
        updated_at: db.serverDate(),
      }

      if (this.data.submissionId) {
        await db.collection('user_problems').doc(this.data.submissionId).update({ data: payload })
      } else {
        await db.collection('user_problems').add({
          data: {
            ...payload,
            created_at: db.serverDate(),
          },
        })
      }
      wx.showToast({ title: this.data.submissionId ? '保存成功' : '提交成功', icon: 'success' })
      clearServiceCaches()
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
    } catch (error) {
      console.warn('submit service failed', error)
      wx.showModal({
        title: '提交失败',
        content: error?.message || '请检查数据库和云存储权限',
        showCancel: false,
      })
    } finally {
      this.setData({ submitting: false })
      hideAppLoading()
    }
  },
})
