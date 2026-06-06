const {
  getCurrentUser,
  getCurrentProfile,
  ensureUser,
  logoutCurrentUser,
  getUserCacheKeys,
} = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')
const AVATAR_TEMP_URL_CACHE_KEY = 'miniapp_avatar_temp_url_cache_v1'

function readAvatarUrlCache() {
  try {
    return wx.getStorageSync(AVATAR_TEMP_URL_CACHE_KEY) || {}
  } catch (error) {
    return {}
  }
}

function writeAvatarUrlCache(cache) {
  try {
    wx.setStorageSync(AVATAR_TEMP_URL_CACHE_KEY, cache)
  } catch (error) {
    console.warn('writeAvatarUrlCache failed', error)
  }
}

function removeAvatarUrlCacheEntry(key = '') {
  const cacheKey = String(key || '').trim()
  if (!cacheKey) return
  try {
    const cache = wx.getStorageSync(AVATAR_TEMP_URL_CACHE_KEY) || {}
    if (!cache[cacheKey]) return
    delete cache[cacheKey]
    wx.setStorageSync(AVATAR_TEMP_URL_CACHE_KEY, cache)
  } catch (error) {
    console.warn('removeAvatarUrlCacheEntry failed', error)
  }
}

Page({
  data: {
    currentUser: null,
    currentProfile: null,
    isAdmin: false,
    favoriteCount: 0,
    historyCount: 0,
    submissionCount: 0,
    adminNoticeCount: 0,
    adminNoticeText: '',
    loading: false,
    navigating: false,
    avatarLoadFailed: false,
    avatarRetrying: false,
    legalAccepted: false,
  },

  lastLoadAt: 0,
  lastCountsAt: 0,
  lastAdminNoticeAt: 0,

  normalizeDisplayUser(user, profile) {
    if (!user && !profile) return null
    const id = user?.id || profile?.id || user?.uid || profile?.uid || ''
    const username = profile?.username || user?.username || profile?.nickName || user?.nickName || '微信用户'
    const avatarUrl = profile?.avatarUrl || profile?.avatar_url || user?.avatarUrl || user?.avatar_url || ''
    const avatar = profile?.avatar || user?.avatar || (username ? String(username).slice(0, 1) : '微')
    return {
      ...(user || {}),
      ...(profile || {}),
      id,
      username,
      avatarUrl,
      avatar,
      avatarText: avatar,
      displayName: username,
    }
  },

  async resolveAvatarDisplayUrl(value, options = {}) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    const forceRefresh = options?.forceRefresh === true
    const cache = readAvatarUrlCache()
    const cached = cache[raw]
    if (!forceRefresh && cached?.url && cached?.ts && Date.now() - cached.ts <= 30 * 60 * 1000) {
      return cached.url
    }

    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      const nextUrl = res?.fileList?.[0]?.tempFileURL || raw
      cache[raw] = {
        ts: Date.now(),
        url: nextUrl,
      }
      writeAvatarUrlCache(cache)
      return nextUrl
    } catch (error) {
      console.warn('resolve account avatar failed', error)
      return raw
    }
  },

  async hydrateDisplayUserAvatar(displayUser) {
    if (!displayUser) return null
    const rawAvatarUrl = String(displayUser.avatarUrl || displayUser.avatar_url || '').trim()
    const avatarDisplayUrl = await this.resolveAvatarDisplayUrl(rawAvatarUrl)
    return {
      ...displayUser,
      avatarUrl: rawAvatarUrl,
      rawAvatarUrl,
      avatarDisplayUrl,
      avatarSrc: avatarDisplayUrl || rawAvatarUrl,
      hasAvatarImage: !!(avatarDisplayUrl || rawAvatarUrl),
    }
  },

  getCachedWechatProfile() {
    try {
      const userId = this.data.currentUser?.id || ''
      const keys = getUserCacheKeys(userId)
      return wx.getStorageSync(keys.lastWechatProfileKey) || wx.getStorageSync('lastWechatProfile') || null
    } catch (error) {
      console.warn('getCachedWechatProfile failed', error)
      return null
    }
  },

  onLoad() {},

  async onShow() {
    if (Date.now() - this.lastLoadAt < 800) return
    await this.loadAccountData()
  },

  onUnload() {
    wx.hideLoading()
  },

  async loadAccountData() {
    this.lastLoadAt = Date.now()
    const user = await getCurrentUser()
    if (!user?.id) {
      this.setData({
        currentUser: null,
        currentProfile: null,
        isAdmin: false,
        favoriteCount: 0,
        historyCount: 0,
        submissionCount: 0,
        adminNoticeCount: 0,
        adminNoticeText: '',
        avatarLoadFailed: false,
        avatarRetrying: false,
      })
      return
    }

    const profile = await getCurrentProfile()
    const cachedWechatProfile = this.getCachedWechatProfile()
    const userCacheKeys = getUserCacheKeys(user.id)
    const cachedDisplayUser = (() => {
      try {
        return wx.getStorageSync(userCacheKeys.currentUserDisplayKey) || null
      } catch (error) {
        return null
      }
    })()
    const fallbackAvatarUrl = profile?.avatarUrl || cachedDisplayUser?.avatarUrl || cachedWechatProfile?.avatarUrl || user?.avatarUrl || ''
    let displayUser = this.normalizeDisplayUser(user, {
      ...(cachedWechatProfile || {}),
      ...(cachedDisplayUser || {}),
      ...(profile || {}),
      avatarUrl: fallbackAvatarUrl,
    })
    displayUser = await this.hydrateDisplayUserAvatar(displayUser)
    const isAdmin = !!(user?.isAdmin || profile?.isAdmin || ['admin', 'administrator', 'root'].includes(String(profile?.role || '').trim().toLowerCase()))
    this.setData({
      currentUser: displayUser,
      currentProfile: profile,
      isAdmin,
      adminNoticeCount: isAdmin ? this.data.adminNoticeCount : 0,
      adminNoticeText: isAdmin ? this.data.adminNoticeText : '',
      avatarLoadFailed: false,
      avatarRetrying: false,
    })
    if (!displayUser?.id) return

    try {
      const mergedUser = {
        ...(user || {}),
        ...(profile || {}),
        ...displayUser,
      }
      const keys = getUserCacheKeys(displayUser.id)
      wx.setStorageSync(keys.currentUserKey, mergedUser)
      wx.setStorageSync(keys.currentUserDisplayKey, displayUser)
      wx.setStorageSync('currentUser', mergedUser)
      wx.setStorageSync('currentUserDisplay', displayUser)
      getApp().globalData.currentUser = mergedUser
    } catch (error) {
      console.warn('sync latest display user failed', error)
    }

    this.loadAccountCounts(displayUser.id)
    if (isAdmin) {
      this.loadAdminNoticeCount({ force: true })
    }
  },

  async loadAccountCounts(userId = '') {
    if (!userId) return
    if (Date.now() - this.lastCountsAt < 1500) return
    this.lastCountsAt = Date.now()
    Promise.all([
      wx.cloud.database().collection('problem_favorites').where({ user_id: userId }).count(),
      wx.cloud.database().collection('problem_history').where({ user_id: userId }).count(),
      this.countUserSubmissions(userId),
    ]).then(([favorites, history, submissions]) => {
      this.setData({
        favoriteCount: Number(favorites?.total || favorites?.count || 0),
        historyCount: Number(history?.total || history?.count || 0),
        submissionCount: Number(submissions || 0),
      })
    }).catch((error) => {
      console.warn('loadAccountCounts failed', error)
    })
  },

  isVisibleSubmission(item = {}) {
    const status = String(item.status || '').trim().toLowerCase()
    return item.deleted !== true && item.is_deleted !== true && !['deleted', 'removed'].includes(status)
  },

  async countUserSubmissions(userId = '') {
    if (!userId) return 0
    try {
      const db = wx.cloud.database()
      let total = 0
      let skip = 0
      const pageSize = 100
      while (true) {
        const { data } = await db.collection('user_problems')
          .where({ user_id: userId })
          .skip(skip)
          .limit(pageSize)
          .get()
        const rows = data || []
        total += rows.filter((item) => this.isVisibleSubmission(item)).length
        if (rows.length < pageSize) break
        skip += rows.length
      }
      return total
    } catch (error) {
      console.warn('count user submissions failed', error)
      return 0
    }
  },

  async safeCount(collectionName, where = {}) {
    try {
      const res = await wx.cloud.database().collection(collectionName).where(where).count()
      return Number(res?.total || res?.count || 0)
    } catch (error) {
      console.warn(`count ${collectionName} failed`, error)
      return 0
    }
  },

  async countPendingSubmissions() {
    try {
      const db = wx.cloud.database()
      let total = 0
      let skip = 0
      const pageSize = 100
      while (true) {
        const { data } = await db.collection('user_problems')
          .where({ status: 'pending' })
          .skip(skip)
          .limit(pageSize)
          .get()
        const rows = data || []
        total += rows.filter((item) => this.isVisibleSubmission(item)).length
        if (rows.length < pageSize) break
        skip += rows.length
      }
      return total
    } catch (error) {
      console.warn('count pending submissions failed', error)
      return 0
    }
  },

  async loadAdminNoticeCount(options = {}) {
    const force = options?.force === true
    if (!force && Date.now() - this.lastAdminNoticeAt < 1500) return
    this.lastAdminNoticeAt = Date.now()
    try {
      const [pendingSubmissions, pendingFeedback, pendingRewardOrders] = await Promise.all([
        this.countPendingSubmissions(),
        this.safeCount('user_feedback', { status: 'pending' }),
        this.safeCount('reward_orders', { status: 'pending' }),
      ])
      const total = pendingSubmissions + pendingFeedback + pendingRewardOrders
      this.setData({
        adminNoticeCount: total,
        adminNoticeText: total > 99 ? '99+' : String(total),
      })
    } catch (error) {
      console.warn('loadAdminNoticeCount failed', error)
      this.setData({
        adminNoticeCount: 0,
        adminNoticeText: '',
      })
    }
  },

  async loginWechat() {
    if (!this.data.legalAccepted) {
      wx.showToast({ title: '请先阅读并同意相关协议', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      let profile = null
      try {
        const profileRes = await wx.getUserProfile({
          desc: '用于显示你的微信昵称和头像',
        })
        profile = profileRes.userInfo || null
        console.log('[login debug] wx.getUserProfile userInfo:', profile)
      } catch (profileError) {
        this.setData({ loading: false })
        if (profileError?.errMsg && !String(profileError.errMsg).includes('cancel')) {
          wx.showToast({ title: '获取微信资料失败', icon: 'none' })
        }
        return
      }

      const user = await ensureUser(profile)
      console.log('[login debug] miniappAuth user:', user)
      if (!user?.id) {
        this.setData({ loading: false })
        wx.showToast({ title: '微信登录失败，请稍后重试', icon: 'none' })
        return
      }
      const latestProfile = await getCurrentProfile()
      let displayUser = this.normalizeDisplayUser(user, {
        ...(profile || {}),
        ...(latestProfile || {}),
        avatarUrl: latestProfile?.avatarUrl || profile?.avatarUrl || user?.avatarUrl || '',
      })
      displayUser = await this.hydrateDisplayUserAvatar(displayUser)

      this.setData({
        currentUser: displayUser,
        currentProfile: latestProfile || profile,
        isAdmin: !!(user?.isAdmin || latestProfile?.isAdmin || ['admin', 'administrator', 'root'].includes(String(latestProfile?.role || '').trim().toLowerCase())),
        loading: false,
        avatarLoadFailed: false,
        avatarRetrying: false,
      })
      try {
        const keys = getUserCacheKeys(displayUser.id)
        wx.setStorageSync(keys.currentUserKey, displayUser)
        wx.setStorageSync(keys.currentUserDisplayKey, displayUser)
        wx.setStorageSync('currentUser', displayUser)
        wx.setStorageSync('currentUserDisplay', displayUser)
      } catch (storageError) {
        console.warn('save currentUserDisplay failed', storageError)
      }
      try {
        const keys = getUserCacheKeys(displayUser.id)
        wx.setStorageSync(keys.lastWechatProfileKey, profile)
        wx.setStorageSync('lastWechatProfile', profile)
      } catch (storageError) {
        console.warn('save lastWechatProfile failed', storageError)
      }

      wx.showToast({
        title: displayUser?.username ? '登录成功' : '登录成功，资料同步中',
        icon: 'success',
      })

      this.loadAccountCounts(displayUser.id)
      if (this.data.isAdmin) {
        this.loadAdminNoticeCount({ force: true })
      }
    } catch (error) {
      this.setData({ loading: false })
      wx.showModal({
        title: '微信登录失败',
        content: error?.message || '请检查云函数部署、当前云环境和真机调试状态',
        showCancel: false,
      })
    }
  },

  toggleLegalAccepted() {
    this.setData({
      legalAccepted: !this.data.legalAccepted,
    })
  },

  async onAvatarLoadError(e) {
    const currentUser = this.data.currentUser || null
    const avatarUrl = currentUser?.avatarSrc || currentUser?.avatarDisplayUrl || currentUser?.avatarUrl || ''
    const rawAvatarUrl = String(currentUser?.rawAvatarUrl || currentUser?.avatarUrl || '').trim()
    console.warn('account avatar image load failed', { avatarUrl, rawAvatarUrl, detail: e?.detail })

    if (rawAvatarUrl.startsWith('cloud://') && !this.data.avatarRetrying) {
      try {
        this.setData({ avatarRetrying: true })
        removeAvatarUrlCacheEntry(rawAvatarUrl)
        const nextAvatarUrl = await this.resolveAvatarDisplayUrl(rawAvatarUrl, { forceRefresh: true })
        if (nextAvatarUrl && nextAvatarUrl !== avatarUrl) {
          this.setData({
            currentUser: {
              ...(currentUser || {}),
              avatarDisplayUrl: nextAvatarUrl,
              avatarSrc: nextAvatarUrl,
              hasAvatarImage: true,
            },
            avatarLoadFailed: false,
          })
          return
        }
      } catch (error) {
        console.warn('retry account avatar load failed', error)
      }
    }

    this.setData({
      avatarLoadFailed: true,
      avatarRetrying: false,
    })
  },

  onAvatarLoad() {
    if (this.data.avatarLoadFailed || this.data.avatarRetrying) {
      this.setData({
        avatarLoadFailed: false,
        avatarRetrying: false,
      })
    }
  },

  openFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' })
  },

  navigateToPage(url = '', requiresLogin = true) {
    if (!url) return
    if (requiresLogin && !this.data.currentUser?.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (this.data.navigating) return
    this.setData({ navigating: true })
    showAppLoading('正在打开')
    wx.navigateTo({
      url,
      complete: () => {
        this.setData({ navigating: false })
        hideAppLoading()
      },
    })
  },

  openFavorites() {
    this.navigateToPage('/pages/accountList/index?type=favorites')
  },

  openHistory() {
    this.navigateToPage('/pages/accountList/index?type=history')
  },

  openSubmissions() {
    this.navigateToPage('/pages/accountList/index?type=submissions')
  },

  openRewards() {
    this.navigateToPage('/pages/rewards/index')
  },

  openRewardOrders() {
    this.navigateToPage('/pages/rewardOrders/index')
  },

  openAddresses() {
    this.navigateToPage('/pages/address/index')
  },

  openLegal() {
    wx.navigateTo({ url: '/pages/legal/index' })
  },

  openAdmin() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '仅管理员可进入', icon: 'none' })
      return
    }
    this.navigateToPage('/pages/admin/index', false)
  },

  openProfileEdit() {
    this.navigateToPage('/pages/profile-edit/index')
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将回到游客状态，本地“我的”页数据会暂时清空。',
      success: (res) => {
        if (!res.confirm) return
        logoutCurrentUser()
        this.setData({
          currentUser: null,
          currentProfile: null,
          isAdmin: false,
          submissionCount: 0,
          favoriteCount: 0,
          historyCount: 0,
          adminNoticeCount: 0,
          adminNoticeText: '',
        })
        wx.showToast({ title: '已退出', icon: 'success' })
      },
    })
  },
})
