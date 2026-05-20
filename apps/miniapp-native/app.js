App({
  globalData: {
    envId: '',
    currentUser: null,
  },

  onLaunch() {
    if (wx.cloud) {
      const dynamicEnv = wx.cloud.DYNAMIC_CURRENT_ENV
      wx.cloud.init({
        // 跟随微信开发者工具 / 真机当前绑定的云环境，避免硬编码环境 ID 失效
        env: dynamicEnv,
        traceUser: true,
      })
      this.globalData.envId = dynamicEnv
    }
  },
})
