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

function normalizeAnnouncement(item = {}) {
  return {
    id: item.id || item._id || '',
    title: item.title || '',
    content: item.content || '',
    confirmText: item.confirmText || item.confirm_text || '知道了',
    enabled: item.enabled === true,
    statusText: item.enabled === true ? '启用中' : '已停用',
    updatedAtText: formatTime(item.updated_at || item.updatedAt || item.created_at || item.createdAt),
  }
}

Page({
  data: {
    loading: false,
    opLoading: false,
    opTargetId: '',
    announcements: [],
    shouldRefresh: false,
  },

  onLoad() {
    this.guardAdmin()
  },

  onShow() {
    if (this.data.shouldRefresh) {
      this.setData({ shouldRefresh: false })
      this.loadAnnouncements()
    }
  },

  async onPullDownRefresh() {
    await this.loadAnnouncements()
    wx.stopPullDownRefresh()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.loadAnnouncements()
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async loadAnnouncements() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminListAnnouncements',
          limit: 100,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '加载失败')
      this.setData({
        announcements: (result.announcements || []).map(normalizeAnnouncement),
      })
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查云函数和 app_announcements 集合权限',
        showCancel: false,
      })
      this.setData({ announcements: [] })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  addAnnouncement() {
    this.setData({ shouldRefresh: true })
    wx.navigateTo({ url: '/pages/announcement-edit/index' })
  },

  editAnnouncement(event) {
    const id = event.currentTarget.dataset.id || ''
    if (!id) return
    this.setData({ shouldRefresh: true })
    wx.navigateTo({ url: `/pages/announcement-edit/index?id=${encodeURIComponent(id)}` })
  },

  async toggleAnnouncement(event) {
    const id = event.currentTarget.dataset.id || ''
    if (!id) return
    this.setData({ opLoading: true, opTargetId: id })
    wx.showLoading({ title: '处理中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminToggleAnnouncement',
          announcementId: id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '操作失败')
      wx.showToast({ title: result.enabled ? '已启用' : '已停用', icon: 'success' })
      this.setData({
        announcements: this.data.announcements.map((item) => (
          item.id === id
            ? { ...item, enabled: result.enabled === true, statusText: result.statusText || (result.enabled ? '启用中' : '已停用') }
            : item
        )),
      })
    } catch (error) {
      wx.showModal({
        title: '操作失败',
        content: error?.message || '请检查云函数和 app_announcements 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ opLoading: false, opTargetId: '' })
      wx.hideLoading()
    }
  },

  deleteAnnouncement(event) {
    const id = event.currentTarget.dataset.id || ''
    const title = event.currentTarget.dataset.title || '这条公告'
    if (!id) return
    wx.showModal({
      title: '删除公告',
      content: `确定删除「${title}」吗？`,
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: async (res) => {
        if (!res.confirm) return
        await this.confirmDeleteAnnouncement(id)
      },
    })
  },

  async confirmDeleteAnnouncement(id = '') {
    this.setData({ opLoading: true, opTargetId: id })
    wx.showLoading({ title: '删除中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminDeleteAnnouncement',
          announcementId: id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '删除失败')
      wx.showToast({ title: '已删除', icon: 'success' })
      this.setData({
        announcements: this.data.announcements.filter((item) => item.id !== id),
      })
    } catch (error) {
      wx.showModal({
        title: '删除失败',
        content: error?.message || '请检查云函数和 app_announcements 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ opLoading: false, opTargetId: '' })
      wx.hideLoading()
    }
  },
})
