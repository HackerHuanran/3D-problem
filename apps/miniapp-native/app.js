App({
  globalData: {
    envId: 'cloud1-d0gqkk2h2dea42d2b',
    currentUser: null,
  },

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true,
      })
    }
  },
})
