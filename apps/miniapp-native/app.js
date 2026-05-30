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
    this.trackDailyUsage('launch')
  },

  onShow() {
    this.trackDailyUsage('show')
  },

  trackDailyUsage(scene = 'show') {
    if (!wx.cloud) return
    const dayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    const hourKey = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
    const cacheKey = 'miniapp_usage_tracked_hour_v1'
    try {
      const lastHour = wx.getStorageSync(cacheKey)
      if (lastHour === `${dayKey}_${hourKey}`) return
      wx.setStorageSync(cacheKey, `${dayKey}_${hourKey}`)
    } catch (error) {
      console.warn('trackDailyUsage cache failed', error)
    }

    setTimeout(() => {
      wx.cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'trackUsage',
          dayKey,
          hourKey,
          scene,
        },
      }).catch((error) => {
        console.warn('trackDailyUsage failed', error)
      })
    }, 600)
  },
})
