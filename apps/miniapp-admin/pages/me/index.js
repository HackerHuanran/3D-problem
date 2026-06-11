function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

Page({
  data: {
    user: null,
    avatarText: '管',
    envId: 'cloud1-d0gqkk2h2dea42d2b',
  },

  onShow() {
    this.loadUser()
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  loadUser() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      getApp().globalData.currentUser = null
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    const username = String(user.username || user.id || '管')
    this.setData({
      user,
      avatarText: username.slice(0, 1),
      envId: getApp().globalData.envId || this.data.envId,
    })
  },

  refreshLogin() {
    wx.reLaunch({ url: '/pages/login/index' })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出管理端吗？',
      success: (res) => {
        if (!res.confirm) return
        getApp().globalData.currentUser = null
        try {
          wx.removeStorageSync('adminCurrentUser')
        } catch (error) {
          console.warn('clear admin user cache failed', error)
        }
        wx.reLaunch({ url: '/pages/login/index' })
      },
    })
  },
})
