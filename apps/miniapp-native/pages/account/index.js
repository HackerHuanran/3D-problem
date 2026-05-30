const {
  getCurrentUser,
  getCurrentProfile,
  ensureUser,
  logoutCurrentUser,
  getUserCacheKeys,
  fetchFavorites,
  fetchHistory,
  fetchFavoriteProblems,
  fetchHistoryProblems,
  fetchMyProblemSubmissions,
  readDashboardCache,
} = require('../../utils/user-service')
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
    loading: false,
    activeTab: 'favorites',
    favoriteProblems: [],
    historyProblems: [],
    problemSubmissions: [],
    secondaryLoading: false,
    navigating: false,
    avatarLoadFailed: false,
    avatarRetrying: false,
    loadedTabs: {},
  },

  lastLoadAt: 0,
  lastCountsAt: 0,

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
        favoriteProblems: [],
        historyProblems: [],
        problemSubmissions: [],
        secondaryLoading: false,
        avatarLoadFailed: false,
        avatarRetrying: false,
        loadedTabs: {},
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
    this.setData({
      currentUser: displayUser,
      currentProfile: profile,
      isAdmin: !!(user?.isAdmin || profile?.isAdmin),
      avatarLoadFailed: false,
      avatarRetrying: false,
    })
    if (displayUser?.id) {
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
    }
    if (!displayUser?.id) return

    const dashboardCache = readDashboardCache(displayUser.id)
    if (dashboardCache) {
      this.setData({
        favoriteProblems: dashboardCache.favoriteProblems || this.data.favoriteProblems,
        historyProblems: dashboardCache.historyProblems || this.data.historyProblems,
        problemSubmissions: dashboardCache.problemSubmissions || this.data.problemSubmissions,
        submissionCount: Array.isArray(dashboardCache.problemSubmissions) ? dashboardCache.problemSubmissions.length : this.data.submissionCount,
        loadedTabs: {
          favorites: Array.isArray(dashboardCache.favoriteProblems),
          history: Array.isArray(dashboardCache.historyProblems),
          submissions: Array.isArray(dashboardCache.problemSubmissions),
        },
      })
    }

    this.loadAccountCounts(displayUser.id)
    this.ensureActiveTabData()
  },

  async loadAccountCounts(userId = '') {
    if (!userId) return
    if (Date.now() - this.lastCountsAt < 1500) return
    this.lastCountsAt = Date.now()
    Promise.all([
      fetchFavorites(userId),
      fetchHistory(userId),
      fetchMyProblemSubmissions(userId),
    ]).then(([favorites, history, problemSubmissions]) => {
      this.setData({
        favoriteCount: favorites.length,
        historyCount: history.length,
        submissionCount: problemSubmissions.length,
      })
      if (!this.data.loadedTabs.submissions && this.data.activeTab === 'submissions') {
        this.setData({
          problemSubmissions,
          loadedTabs: {
            ...(this.data.loadedTabs || {}),
            submissions: true,
          },
        })
      }
    }).catch((error) => {
      console.warn('loadAccountCounts failed', error)
    })
  },

  async ensureActiveTabData() {
    const userId = this.data.currentUser?.id || ''
    const activeTab = this.data.activeTab || 'favorites'
    if (!userId) return
    if (this.data.loadedTabs?.[activeTab]) return
    this.setData({ secondaryLoading: true })
    try {
      if (activeTab === 'favorites') {
        const favoriteProblems = await fetchFavoriteProblems(userId)
        this.setData({
          favoriteProblems,
          loadedTabs: {
            ...(this.data.loadedTabs || {}),
            favorites: true,
          },
        })
      } else if (activeTab === 'history') {
        const historyProblems = await fetchHistoryProblems(userId)
        this.setData({
          historyProblems,
          loadedTabs: {
            ...(this.data.loadedTabs || {}),
            history: true,
          },
        })
      } else if (activeTab === 'submissions') {
        const problemSubmissions = await fetchMyProblemSubmissions(userId)
        this.setData({
          submissionCount: problemSubmissions.length,
          problemSubmissions,
          loadedTabs: {
            ...(this.data.loadedTabs || {}),
            submissions: true,
          },
        })
      }
    } catch (error) {
      console.warn('ensureActiveTabData failed', error)
      wx.showToast({ title: '当前列表加载失败', icon: 'none' })
    } finally {
      this.setData({ secondaryLoading: false })
    }
  },

  async loginWechat() {
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
        isAdmin: !!(user?.isAdmin || latestProfile?.isAdmin),
        loading: false,
        secondaryLoading: false,
        avatarLoadFailed: false,
        avatarRetrying: false,
        loadedTabs: {},
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
      this.ensureActiveTabData()
    } catch (error) {
      this.setData({ loading: false })
      wx.showModal({
        title: '微信登录失败',
        content: error?.message || '请检查云函数部署、当前云环境和真机调试状态',
        showCancel: false,
      })
    }
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

  selectTab(e) {
    const nextTab = e.currentTarget.dataset.tab
    this.setData({ activeTab: nextTab })
    this.ensureActiveTabData()
  },

  openFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' })
  },

  openLegal() {
    wx.navigateTo({ url: '/pages/legal/index' })
  },

  openProblemDetail(e) {
    if (this.data.navigating) return
    const submissionType = e.currentTarget.dataset.submissionType || ''
    const submissionId = e.currentTarget.dataset.submissionId || ''
    if (submissionType === 'knowledge' && submissionId) {
      this.setData({ navigating: true })
      wx.showLoading({ title: '正在打开' })
      wx.navigateTo({
        url: `/pages/knowledge-submit/index?id=${submissionId}`,
        complete: () => this.setData({ navigating: false }),
      })
      return
    }
    const problemId = e.currentTarget.dataset.problemId || e.currentTarget.dataset.id
    if (!problemId) return
    this.setData({ navigating: true })
    wx.showLoading({ title: '正在打开' })
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${problemId}`,
      complete: () => this.setData({ navigating: false }),
    })
  },

  editSubmission(e) {
    if (e?.stopPropagation) e.stopPropagation()
    if (this.data.navigating) return
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.setData({ navigating: true })
    wx.showLoading({ title: '正在打开' })
    const item = this.data.problemSubmissions.find((row) => row.id === id)
    const url = item?.submissionType === 'knowledge'
      ? `/pages/knowledge-submit/index?id=${id}`
      : `/pages/problem-submit/index?id=${id}`
    wx.navigateTo({
      url,
      complete: () => this.setData({ navigating: false }),
    })
  },

  openAdmin() {
    if (!this.data.currentUser?.isAdmin && !this.data.currentProfile?.isAdmin) {
      wx.showToast({ title: '仅管理员可进入', icon: 'none' })
      return
    }
    if (this.data.navigating) return
    this.setData({ navigating: true })
    wx.navigateTo({
      url: '/pages/admin/index',
      complete: () => this.setData({ navigating: false }),
    })
  },

  openProfileEdit() {
    if (!this.data.currentUser?.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (this.data.navigating) return
    this.setData({ navigating: true })
    wx.navigateTo({
      url: '/pages/profile-edit/index',
      complete: () => this.setData({ navigating: false }),
    })
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
          problemSubmissions: [],
          secondaryLoading: false,
          favoriteProblems: [],
          historyProblems: [],
          favoriteCount: 0,
          historyCount: 0,
          loadedTabs: {},
        })
        wx.showToast({ title: '已退出', icon: 'success' })
      },
    })
  },
})
