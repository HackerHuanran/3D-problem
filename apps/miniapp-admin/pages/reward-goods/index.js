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

function formatTime(value) {
  if (!value) return ''
  const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function normalizeGood(item = {}) {
  return {
    id: item.id || item._id || '',
    name: item.name || '',
    imageUrl: normalizeAsset(item.imageUrl || item.image_url),
    imageDisplayUrl: '',
    quantity: Number(item.quantity || 0),
    pointsCost: Number(item.pointsCost || item.points_cost || 0),
    category: item.category || 'filament',
    categoryText: item.categoryText || (item.category === 'model' ? '模型' : item.category === 'other' ? '其他' : '耗材'),
    updatedAtText: formatTime(item.updated_at || item.updatedAt || item.created_at || item.createdAt),
  }
}

Page({
  data: {
    loading: false,
    opLoading: false,
    opTargetId: '',
    goods: [],
    shouldRefresh: false,
  },

  onLoad() {
    this.guardAdmin()
  },

  onShow() {
    if (this.data.shouldRefresh) {
      this.setData({ shouldRefresh: false })
      this.loadGoods()
    }
  },

  async onPullDownRefresh() {
    await this.loadGoods()
    wx.stopPullDownRefresh()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.loadGoods()
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

  async loadGoods() {
    if (this.data.loading) return
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
      const rows = await Promise.all((result.goods || []).map(async (item) => {
        const good = normalizeGood(item)
        return {
          ...good,
          imageDisplayUrl: await this.resolveImage(good.imageUrl),
        }
      }))
      this.setData({ goods: rows })
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查云函数和 reward_goods 集合权限',
        showCancel: false,
      })
      this.setData({ goods: [] })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  addGood() {
    this.setData({ shouldRefresh: true })
    wx.navigateTo({ url: '/pages/reward-good-edit/index' })
  },

  editGood(event) {
    const id = event.currentTarget.dataset.id || ''
    if (!id) return
    this.setData({ shouldRefresh: true })
    wx.navigateTo({ url: `/pages/reward-good-edit/index?id=${encodeURIComponent(id)}` })
  },

  deleteGood(event) {
    const id = event.currentTarget.dataset.id || ''
    const name = event.currentTarget.dataset.name || '这个商品'
    if (!id) return
    wx.showModal({
      title: '删除积分商品',
      content: `确定删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: async (res) => {
        if (!res.confirm) return
        await this.confirmDeleteGood(id)
      },
    })
  },

  async confirmDeleteGood(id = '') {
    this.setData({ opLoading: true, opTargetId: id })
    wx.showLoading({ title: '删除中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminDeleteRewardGood',
          goodsId: id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '删除失败')
      wx.showToast({ title: '已删除', icon: 'success' })
      this.setData({
        goods: this.data.goods.filter((item) => item.id !== id),
      })
    } catch (error) {
      wx.showModal({
        title: '删除失败',
        content: error?.message || '请检查云函数和 reward_goods 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ opLoading: false, opTargetId: '' })
      wx.hideLoading()
    }
  },
})
