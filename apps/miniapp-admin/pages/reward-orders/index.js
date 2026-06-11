const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'done', label: '已处理' },
  { key: 'shipped', label: '已发货' },
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

function buildAddressText(address = {}) {
  return `${address.recipient || ''} ${address.phone || ''} ${address.region_text || ''} ${address.detail || ''}`.trim()
}

function getStatusText(status = '', fallback = '') {
  if (fallback) return fallback
  if (status === 'shipped') return '已发货'
  if (status === 'done') return '已处理'
  return '待处理'
}

Page({
  data: {
    loading: false,
    opLoading: false,
    opTargetId: '',
    filter: 'pending',
    filters: FILTERS.map((item) => ({ ...item, count: 0 })),
    orders: [],
    filteredOrders: [],
  },

  onLoad() {
    this.guardAdmin()
  },

  async onPullDownRefresh() {
    await this.loadOrders()
    wx.stopPullDownRefresh()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.loadOrders()
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
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'resolveFileUrls',
          fileList: [raw],
        },
      })
      const result = res?.result || {}
      const url = result.urlMap?.[raw] || result.fileList?.[0]?.tempFileURL || ''
      if (url) {
        imageCache[raw] = url
        return url
      }
    } catch (error) {
      console.warn('resolve reward order image failed', error)
    }
    return ''
  },

  async loadOrders() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      const db = getApp().getCloud().database()
      const { data } = await db.collection('reward_orders')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()
      const orders = await Promise.all((data || []).map(async (item) => {
        const status = item.status || 'pending'
        const address = item.address_snapshot || {}
        const goodsImage = normalizeAsset(item.goods_image)
        return {
          id: item._id,
          userId: item.user_id || '',
          goodsId: item.goods_id || '',
          goodsName: item.goods_name || '',
          goodsImage,
          goodsImageDisplay: await this.resolveImage(goodsImage),
          pointsCost: Number(item.points_cost || 0),
          status,
          statusText: getStatusText(status, item.status_text),
          trackingNo: item.tracking_no || '',
          address,
          addressText: buildAddressText(address),
          createdAtText: formatTime(item.created_at),
        }
      }))
      this.setOrders(orders)
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查 reward_orders 集合权限',
        showCancel: false,
      })
      this.setOrders([])
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  setOrders(orders = this.data.orders, filter = this.data.filter) {
    const counts = orders.reduce((acc, item) => {
      acc.all += 1
      if (item.status === 'shipped') acc.shipped += 1
      else if (item.status === 'done') acc.done += 1
      else acc.pending += 1
      return acc
    }, { all: 0, pending: 0, done: 0, shipped: 0 })
    const filteredOrders = orders.filter((item) => {
      if (filter === 'pending') return item.status !== 'done' && item.status !== 'shipped'
      if (filter === 'done') return item.status === 'done'
      if (filter === 'shipped') return item.status === 'shipped'
      return true
    })
    this.setData({
      orders,
      filter,
      filteredOrders,
      filters: FILTERS.map((item) => ({ ...item, count: counts[item.key] || 0 })),
    })
  },

  switchFilter(event) {
    this.setOrders(this.data.orders, event.currentTarget.dataset.filter || 'pending')
  },

  findOrder(id = '') {
    return this.data.orders.find((item) => item.id === id) || null
  },

  viewAddress(event) {
    const item = this.findOrder(event.currentTarget.dataset.id)
    if (!item) return
    const address = item.address || {}
    wx.showModal({
      title: '收货地址',
      content: `商品：${item.goodsName}\n用户：${item.userId}\n\n收件人：${address.recipient || '未填写'}\n电话：${address.phone || '未填写'}\n地区：${address.region_text || '未填写'}\n地址：${address.detail || '未填写'}`,
      showCancel: false,
      confirmText: '知道了',
    })
  },

  async markDone(event) {
    const item = this.findOrder(event.currentTarget.dataset.id)
    if (!item?.id) return
    if (item.status === 'done') {
      wx.showToast({ title: '已处理过', icon: 'none' })
      return
    }
    this.setData({ opLoading: true, opTargetId: item.id })
    wx.showLoading({ title: '处理中', mask: true })
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminMarkRewardOrderDone',
          orderId: item.id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '操作失败')
      wx.showToast({ title: '已处理', icon: 'success' })
      const orders = this.data.orders.map((row) => (
        row.id === item.id ? { ...row, status: 'done', statusText: '已处理' } : row
      ))
      this.setOrders(orders, this.data.filter)
    } catch (error) {
      wx.showModal({
        title: '操作失败',
        content: error?.message || '请检查云函数和 reward_orders 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ opLoading: false, opTargetId: '' })
      wx.hideLoading()
    }
  },

  async shipOrder(event) {
    const item = this.findOrder(event.currentTarget.dataset.id)
    if (!item?.id) return
    if (item.status === 'shipped') {
      wx.showToast({ title: '已发货', icon: 'none' })
      return
    }
    if (item.status !== 'done') {
      wx.showToast({ title: '请先标记处理', icon: 'none' })
      return
    }

    const modalRes = await new Promise((resolve) => {
      wx.showModal({
        title: '填写快递单号',
        content: '',
        editable: true,
        placeholderText: '请输入快递单号',
        confirmText: '发货',
        success: resolve,
        fail: () => resolve({ confirm: false }),
      })
    })
    if (!modalRes.confirm) return

    const trackingNo = String(modalRes.content || '').trim()
    if (!trackingNo) {
      wx.showToast({ title: '请填写快递单号', icon: 'none' })
      return
    }

    this.setData({ opLoading: true, opTargetId: item.id })
    wx.showLoading({ title: '发货中', mask: true })
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminShipRewardOrder',
          orderId: item.id,
          trackingNo,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '发货失败')
      wx.showToast({ title: '已发货', icon: 'success' })
      const orders = this.data.orders.map((row) => (
        row.id === item.id
          ? { ...row, status: 'shipped', statusText: '已发货', trackingNo: result.trackingNo || trackingNo }
          : row
      ))
      this.setOrders(orders, this.data.filter)
    } catch (error) {
      wx.showModal({
        title: '发货失败',
        content: error?.message || '请检查云函数和 reward_orders 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ opLoading: false, opTargetId: '' })
      wx.hideLoading()
    }
  },
})
