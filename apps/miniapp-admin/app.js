App({
  globalData: {
    envId: 'cloud1-d0gqkk2h2dea42d2b',
    resourceAppid: 'wxa311ba15016b7732',
    currentUser: null,
    sharedCloud: null,
    cloudReadyPromise: null,
    cloudReady: false,
  },

  onLaunch() {
    this.initCloud()
    this.checkClientUpdate()
  },

  initCloud() {
    if (this.globalData.cloudReadyPromise) return this.globalData.cloudReadyPromise
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true,
      })
      if (wx.cloud.Cloud) {
        this.globalData.sharedCloud = new wx.cloud.Cloud({
          resourceAppid: this.globalData.resourceAppid,
          resourceEnv: this.globalData.envId,
        })
        const initResult = this.globalData.sharedCloud.init({
          env: this.globalData.envId,
          traceUser: true,
        })
        this.globalData.cloudReadyPromise = Promise.resolve(initResult).then(() => {
          this.globalData.cloudReady = true
          return this.globalData.sharedCloud
        })
        return this.globalData.cloudReadyPromise
      }
      this.globalData.cloudReady = true
      this.globalData.cloudReadyPromise = Promise.resolve(wx.cloud)
      return this.globalData.cloudReadyPromise
    }
    this.globalData.cloudReadyPromise = Promise.reject(new Error('当前微信版本不支持云开发'))
    return this.globalData.cloudReadyPromise
  },

  async ensureCloud() {
    return await this.initCloud()
  },

  getCloud() {
    if (!this.globalData.cloudReadyPromise) this.initCloud()
    return this.globalData.sharedCloud || wx.cloud
  },

  checkClientUpdate() {
    if (!wx.canIUse?.('getUpdateManager')) return
    const updateManager = wx.getUpdateManager()
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '发现新版本',
        content: '管理端新版本已准备好，是否立即重启更新？',
        confirmText: '立即更新',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) updateManager.applyUpdate()
        },
      })
    })
  },
})
