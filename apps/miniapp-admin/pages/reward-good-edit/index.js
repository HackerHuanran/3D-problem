const CATEGORY_OPTIONS = [
  { id: 'filament', label: '耗材' },
  { id: 'model', label: '模型' },
  { id: 'other', label: '其他' },
]

const imageCache = {}

function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

function normalizeAsset(value = '') {
  if (!value) return ''
  if (typeof value === 'object') {
    return String(value.fileID || value.fileId || value.url || value.src || value.path || '').trim()
  }
  return String(value || '').trim()
}

function sanitizePathSegment(value = '') {
  return String(value || 'reward-good').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'reward-good'
}

Page({
  data: {
    id: '',
    loading: false,
    saving: false,
    name: '',
    imageUrl: '',
    imageDisplayUrl: '',
    quantity: '',
    pointsCost: '',
    category: 'filament',
    categoryText: '耗材',
    categoryIndex: 0,
    categoryOptions: CATEGORY_OPTIONS,
  },

  onLoad(options = {}) {
    this.setData({
      id: decodeURIComponent(options.id || ''),
    })
    this.guardAdmin()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    if (this.data.id) {
      wx.setNavigationBarTitle({ title: '修改商品' })
      this.loadGood()
    }
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async resolveImage(value = '') {
    const raw = normalizeAsset(value)
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    if (imageCache[raw]) return imageCache[raw]
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'resolveFileUrls',
          fileList: [raw],
        },
      })
      const result = res?.result || {}
      const url = result.urlMap?.[raw] || result.fileList?.[0]?.tempFileURL || result.fileList?.[0]?.tempFileUrl || ''
      if (url) {
        imageCache[raw] = url
        return url
      }
    } catch (error) {
      console.warn('resolve reward good image failed', error)
    }
    return ''
  },

  async loadGood() {
    if (!this.data.id || this.data.loading) return
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminListRewardGoods',
          limit: 100,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '加载失败')
      const item = (result.goods || []).find((row) => row.id === this.data.id)
      if (!item) throw new Error('商品不存在或已删除')
      const category = item.category || 'filament'
      const categoryIndex = Math.max(0, CATEGORY_OPTIONS.findIndex((option) => option.id === category))
      const imageUrl = normalizeAsset(item.imageUrl || item.image_url)
      this.setData({
        name: item.name || '',
        imageUrl,
        imageDisplayUrl: await this.resolveImage(imageUrl),
        quantity: String(item.quantity || 0),
        pointsCost: String(item.pointsCost || item.points_cost || 0),
        category,
        categoryText: CATEGORY_OPTIONS[categoryIndex]?.label || '耗材',
        categoryIndex,
      })
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查云函数和 reward_goods 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: event.detail.value })
  },

  onCategoryChange(event) {
    const categoryIndex = Number(event.detail.value || 0)
    const option = CATEGORY_OPTIONS[categoryIndex] || CATEGORY_OPTIONS[0]
    this.setData({
      categoryIndex,
      category: option.id,
      categoryText: option.label,
    })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (file) await this.uploadImage(file)
      },
    })
  },

  clearImage() {
    this.setData({
      imageUrl: '',
      imageDisplayUrl: '',
    })
  },

  async uploadImage(file = '') {
    const key = sanitizePathSegment(this.data.id || this.data.name || Date.now())
    const ext = (file.split('.').pop() || 'jpg').toLowerCase()
    const cloudPath = `reward-goods/${key}-${Date.now()}.${ext}`
    wx.showLoading({ title: '上传中', mask: true })
    try {
      await getApp().ensureCloud()
      const upload = await getApp().getCloud().uploadFile({
        cloudPath,
        filePath: file,
      })
      const fileID = upload.fileID || ''
      if (!fileID) throw new Error('未获取到云文件 ID')
      this.setData({
        imageUrl: fileID,
        imageDisplayUrl: await this.resolveImage(fileID),
      })
      wx.showToast({ title: '已上传', icon: 'success' })
    } catch (error) {
      wx.showModal({
        title: '上传失败',
        content: error?.message || '请检查云存储权限',
        showCancel: false,
      })
    } finally {
      wx.hideLoading()
    }
  },

  async save() {
    if (this.data.saving) return
    const name = String(this.data.name || '').trim()
    const quantity = Number(this.data.quantity || 0)
    const pointsCost = Number(this.data.pointsCost || 0)
    if (!name || quantity < 0 || pointsCost <= 0) {
      wx.showToast({ title: '请完整填写商品信息', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminSaveRewardGood',
          goods: {
            id: this.data.id,
            name,
            imageUrl: this.data.imageUrl,
            quantity,
            pointsCost,
            category: this.data.category,
          },
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '保存失败')
      wx.showToast({ title: this.data.id ? '已更新' : '已上架', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查云函数和 reward_goods 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ saving: false })
      wx.hideLoading()
    }
  },
})
