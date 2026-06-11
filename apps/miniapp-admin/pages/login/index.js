Page({
  data: {
    loading: false,
    user: null,
    isAdmin: false,
    error: '',
    debugInfo: '',
  },

  onLoad() {
    const cachedUser = this.readCachedUser()
    if (cachedUser?.id) {
      const isAdmin = cachedUser.isAdmin === true
      this.setData({
        user: cachedUser,
        isAdmin,
      })
      getApp().globalData.currentUser = cachedUser
      if (isAdmin) {
        this.goHome()
      }
    }
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  saveCachedUser(user = null) {
    try {
      if (user) wx.setStorageSync('adminCurrentUser', user)
      else wx.removeStorageSync('adminCurrentUser')
    } catch (error) {
      console.warn('save admin user cache failed', error)
    }
  },

  async login() {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    wx.showLoading({ title: '登录中', mask: true })
    try {
      await getApp().ensureCloud()
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminLogin',
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '登录失败')
      }
      const user = result.user || null
      const isAdmin = user?.isAdmin === true
      getApp().globalData.currentUser = user
      this.saveCachedUser(user)
      this.setData({
        user,
        isAdmin,
        error: isAdmin ? '' : '当前微信账号不是管理员，请先在 profiles 集合中把该账号设置为 isAdmin: true。',
      })
      wx.showToast({
        title: isAdmin ? '登录成功' : '无管理员权限',
        icon: isAdmin ? 'success' : 'none',
      })
      if (isAdmin) {
        this.goHome()
      }
    } catch (error) {
      let debugInfo = ''
      try {
        await getApp().ensureCloud()
        const debugRes = await getApp().getCloud().callFunction({
          name: 'miniappAuth',
          data: {
            action: 'debugContext',
          },
        })
        debugInfo = JSON.stringify(debugRes?.result || {}, null, 2)
      } catch (debugError) {
        debugInfo = `debugContext 调用失败：${debugError?.message || debugError}`
      }
      this.setData({
        user: null,
        isAdmin: false,
        error: error?.message || '登录失败，请检查云环境和 miniappAuth 云函数。',
        debugInfo,
      })
      this.saveCachedUser(null)
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  logout() {
    getApp().globalData.currentUser = null
    this.saveCachedUser(null)
    this.setData({
      user: null,
      isAdmin: false,
      error: '',
      debugInfo: '',
    })
    wx.showToast({ title: '已退出', icon: 'success' })
  },

  goHome() {
    wx.switchTab({
      url: '/pages/home/index',
    })
  },
})
