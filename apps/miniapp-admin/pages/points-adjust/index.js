function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

Page({
  data: {
    submitting: false,
    targetUserId: '',
    delta: '',
    reason: '',
    resultText: '',
  },

  onLoad() {
    this.guardAdmin()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: event.detail.value })
  },

  async submit() {
    if (this.data.submitting) return
    const targetUserId = String(this.data.targetUserId || '').trim()
    const delta = Math.trunc(Number(this.data.delta || 0))
    const reason = String(this.data.reason || '').trim()
    if (!targetUserId) {
      wx.showToast({ title: '请填写用户 ID', icon: 'none' })
      return
    }
    if (!delta) {
      wx.showToast({ title: '请填写非 0 积分', icon: 'none' })
      return
    }

    this.setData({ submitting: true, resultText: '' })
    wx.showLoading({ title: '提交中', mask: true })
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminAdjustUserPoints',
          targetUserId,
          delta,
          reason,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '调整失败')
      }
      this.setData({
        resultText: `调整成功：${result.previousPoints || 0} -> ${result.points || 0}`,
        delta: '',
        reason: '',
      })
      wx.showToast({ title: '调整成功', icon: 'success' })
    } catch (error) {
      wx.showModal({
        title: '调整失败',
        content: error?.message || '请检查用户 ID 和云函数部署',
        showCancel: false,
      })
    } finally {
      this.setData({ submitting: false })
      wx.hideLoading()
    }
  },
})
