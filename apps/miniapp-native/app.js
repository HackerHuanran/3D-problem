App({
  globalData: {
    envId: 'cloud1-d0gqkk2h2dea42d2b',
    currentUser: null,
  },

  announcementChecking: false,
  lastAnnouncementCheckAt: 0,
  clientUpdatePromptShown: false,

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true,
      })
    }
    this.checkClientUpdate()
    this.trackDailyUsage('launch')
    this.checkAppAnnouncement({ delay: 900 })
  },

  onShow() {
    this.trackDailyUsage('show')
    this.checkAppAnnouncement({ delay: 900 })
  },

  checkClientUpdate() {
    if (!wx.canIUse?.('getUpdateManager')) return
    const updateManager = wx.getUpdateManager()

    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        console.info('miniapp update available')
      }
    })

    updateManager.onUpdateReady(() => {
      if (this.clientUpdatePromptShown) return
      this.clientUpdatePromptShown = true
      wx.showModal({
        title: '发现新版本',
        content: '新版本已经准备好，是否立即重启小程序更新？',
        confirmText: '立即更新',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        },
      })
    })

    updateManager.onUpdateFailed(() => {
      wx.showToast({
        title: '新版本下载失败，请稍后重试',
        icon: 'none',
      })
    })
  },

  getAnnouncementReadKey(announcementId = '') {
    return `miniapp_announcement_read_${String(announcementId || '').trim()}`
  },

  hasReadAnnouncement(announcementId = '') {
    if (!announcementId) return true
    try {
      return wx.getStorageSync(this.getAnnouncementReadKey(announcementId)) === true
    } catch (error) {
      return false
    }
  },

  markAnnouncementRead(announcementId = '') {
    if (!announcementId) return
    try {
      wx.setStorageSync(this.getAnnouncementReadKey(announcementId), true)
    } catch (error) {
      console.warn('mark announcement read failed', error)
    }
  },

  async checkAppAnnouncement({ delay = 0, force = false } = {}) {
    if (!wx.cloud || this.announcementChecking) return
    if (!force && Date.now() - this.lastAnnouncementCheckAt < 5 * 60 * 1000) return
    this.announcementChecking = true
    this.lastAnnouncementCheckAt = Date.now()

    setTimeout(async () => {
      try {
        const db = wx.cloud.database()
        const { data } = await db.collection('app_announcements')
          .where({ enabled: true })
          .orderBy('updated_at', 'desc')
          .limit(1)
          .get()
        const announcement = data?.[0]
        const announcementId = announcement?._id || announcement?.notice_id || ''
        if (!announcementId || this.hasReadAnnouncement(announcementId)) return

        wx.showModal({
          title: announcement.title || '功能更新',
          content: announcement.content || '有新的功能上线啦，欢迎体验。',
          showCancel: false,
          confirmText: announcement.confirm_text || '知道了',
          success: () => {
            this.markAnnouncementRead(announcementId)
          },
        })
      } catch (error) {
        console.warn('checkAppAnnouncement failed', error)
      } finally {
        this.announcementChecking = false
      }
    }, Math.max(0, Number(delay) || 0))
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
