const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '未处理' },
  { key: 'resolved', label: '已处理' },
]

function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
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

function normalizeFeedback(item = {}) {
  const status = item.status || 'pending'
  return {
    id: item._id,
    userId: item.user_id || '',
    userName: item.user_name || '微信用户',
    type: item.type || '建议',
    title: item.title || '',
    content: item.content || '',
    status,
    statusText: status === 'resolved' ? '已处理' : '未处理',
    createdAtText: formatTime(item.created_at),
  }
}

Page({
  data: {
    loading: false,
    opLoading: false,
    opTargetId: '',
    filter: 'pending',
    filters: FILTERS.map((item) => ({ ...item, count: 0 })),
    feedbackList: [],
    filteredFeedback: [],
  },

  onLoad() {
    this.guardAdmin()
  },

  async onPullDownRefresh() {
    await this.loadFeedback()
    wx.stopPullDownRefresh()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.loadFeedback()
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async loadFeedback() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      const db = getApp().getCloud().database()
      const { data } = await db.collection('user_feedback')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()
      this.setFeedback((data || []).map(normalizeFeedback))
    } catch (error) {
      const message = error?.message || ''
      const code = error?.errCode || error?.code || ''
      if (String(code).includes('-502005') || /collection not exists|Db or Table not exist|DATABASE_COLLECTION_NOT_EXIST/i.test(message)) {
        this.setFeedback([])
        wx.showToast({
          title: '请先创建反馈集合',
          icon: 'none',
        })
        return
      }
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查 user_feedback 集合权限',
        showCancel: false,
      })
      this.setFeedback([])
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  setFeedback(feedbackList = this.data.feedbackList, filter = this.data.filter) {
    const counts = feedbackList.reduce((acc, item) => {
      acc.all += 1
      if (item.status === 'resolved') acc.resolved += 1
      else acc.pending += 1
      return acc
    }, { all: 0, pending: 0, resolved: 0 })
    const filteredFeedback = feedbackList.filter((item) => {
      if (filter === 'pending') return item.status !== 'resolved'
      if (filter === 'resolved') return item.status === 'resolved'
      return true
    })
    this.setData({
      feedbackList,
      filter,
      filteredFeedback,
      filters: FILTERS.map((item) => ({ ...item, count: counts[item.key] || 0 })),
    })
  },

  switchFilter(event) {
    const filter = event.currentTarget.dataset.filter || 'pending'
    this.setFeedback(this.data.feedbackList, filter)
  },

  findFeedback(id = '') {
    return this.data.feedbackList.find((item) => item.id === id) || null
  },

  viewFeedback(event) {
    const item = this.findFeedback(event.currentTarget.dataset.id)
    if (!item) return
    wx.showModal({
      title: `${item.type}：${item.title}`,
      content: `用户：${item.userName}\n时间：${item.createdAtText || '未知'}\n状态：${item.statusText}\n\n${item.content}`,
      showCancel: false,
      confirmText: '知道了',
    })
  },

  async resolveFeedback(event) {
    const item = this.findFeedback(event.currentTarget.dataset.id)
    if (!item?.id) return
    if (item.status === 'resolved') {
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
          action: 'adminResolveFeedback',
          feedbackId: item.id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '操作失败')
      }
      wx.showToast({ title: '已处理', icon: 'success' })
      const feedbackList = this.data.feedbackList.map((row) => (
        row.id === item.id
          ? { ...row, status: 'resolved', statusText: '已处理' }
          : row
      ))
      this.setFeedback(feedbackList, this.data.filter)
    } catch (error) {
      wx.showModal({
        title: '操作失败',
        content: error?.message || '请检查 user_feedback 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ opLoading: false, opTargetId: '' })
      wx.hideLoading()
    }
  },
})
