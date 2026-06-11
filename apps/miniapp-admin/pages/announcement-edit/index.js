function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

Page({
  data: {
    id: '',
    loading: false,
    saving: false,
    title: '',
    content: '',
    confirmText: '知道了',
    enabled: true,
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
      wx.setNavigationBarTitle({ title: '修改公告' })
      this.loadAnnouncement()
    }
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async loadAnnouncement() {
    if (!this.data.id || this.data.loading) return
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
      const item = (result.announcements || []).find((row) => row.id === this.data.id)
      if (!item) throw new Error('公告不存在或已删除')
      this.setData({
        title: item.title || '',
        content: item.content || '',
        confirmText: item.confirmText || '知道了',
        enabled: item.enabled === true,
      })
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查云函数和 app_announcements 集合权限',
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

  onEnabledChange(event) {
    this.setData({ enabled: event.detail.value === true })
  },

  async save() {
    if (this.data.saving) return
    const title = String(this.data.title || '').trim()
    const content = String(this.data.content || '').trim()
    const confirmText = String(this.data.confirmText || '').trim() || '知道了'
    if (!title || !content) {
      wx.showToast({ title: '请填写公告标题和内容', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminSaveAnnouncement',
          announcement: {
            id: this.data.id,
            title,
            content,
            confirmText,
            enabled: this.data.enabled === true,
          },
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '保存失败')
      wx.showToast({ title: this.data.id ? '已更新公告' : '已发布公告', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查云函数和 app_announcements 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ saving: false })
      wx.hideLoading()
    }
  },
})
