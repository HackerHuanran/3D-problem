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
} = require('../../utils/user-service')

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
  },

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

  async resolveAvatarDisplayUrl(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw

    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      return res?.fileList?.[0]?.tempFileURL || raw
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

  async onLoad() {
    await this.loadAccountData()
  },

  async onShow() {
    await this.loadAccountData()
  },

  onUnload() {
    wx.hideLoading()
  },

  async loadAccountData() {
    const user = await getCurrentUser()
    const profile = user?.id ? await getCurrentProfile() : null
    const cachedWechatProfile = this.getCachedWechatProfile()
    const userCacheKeys = getUserCacheKeys(user?.id || '')
    const cachedDisplayUser = (() => {
      try {
        return wx.getStorageSync(userCacheKeys.currentUserDisplayKey) || wx.getStorageSync('currentUserDisplay') || null
      } catch (error) {
        return null
      }
    })()
    const fallbackAvatarUrl = profile?.avatarUrl || cachedDisplayUser?.avatarUrl || cachedWechatProfile?.avatarUrl || user?.avatarUrl || ''
    const displaySource = user || cachedDisplayUser || profile
    const profileSource = {
      ...(cachedWechatProfile || {}),
      ...(cachedDisplayUser || {}),
      ...(profile || {}),
      avatarUrl: fallbackAvatarUrl,
    }
    let displayUser = this.normalizeDisplayUser(
      displaySource,
      profileSource,
    )
    displayUser = await this.hydrateDisplayUserAvatar(displayUser)
    this.setData({
      currentUser: displayUser,
      currentProfile: profile,
      isAdmin: !!(user?.isAdmin || profile?.isAdmin),
      avatarLoadFailed: false,
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

    if (!this.data.favoriteProblems.length && !this.data.historyProblems.length && !this.data.problemSubmissions.length) {
      this.setData({ secondaryLoading: true })
    }

    Promise.all([
      fetchFavorites(displayUser.id),
      fetchHistory(displayUser.id),
    ]).then(([favorites, history]) => {
      this.setData({
        favoriteCount: favorites.length,
        historyCount: history.length,
      })
    })

    Promise.all([
      fetchFavoriteProblems(displayUser.id),
      fetchHistoryProblems(displayUser.id),
      fetchMyProblemSubmissions(displayUser.id),
    ]).then(([favoriteProblems, historyProblems, problemSubmissions]) => {
        this.setData({
          submissionCount: problemSubmissions.length,
          favoriteProblems,
          historyProblems,
          problemSubmissions,
          secondaryLoading: false,
        })
      }).catch((error) => {
        console.warn('loadAccountData secondary fetch failed', error)
        this.setData({ secondaryLoading: false })
        wx.showToast({ title: '我的数据加载失败', icon: 'none' })
      })
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
        secondaryLoading: true,
        avatarLoadFailed: false,
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

      Promise.all([
        fetchFavorites(displayUser.id),
        fetchHistory(displayUser.id),
      ]).then(([favorites, history]) => {
        this.setData({
          favoriteCount: favorites.length,
          historyCount: history.length,
        })
      })

      Promise.all([
        fetchFavoriteProblems(displayUser.id),
        fetchHistoryProblems(displayUser.id),
        fetchMyProblemSubmissions(displayUser.id),
      ]).then(([favoriteProblems, historyProblems, problemSubmissions]) => {
        this.setData({
          submissionCount: problemSubmissions.length,
          favoriteProblems,
          historyProblems,
          problemSubmissions,
          secondaryLoading: false,
        })
      }).catch((error) => {
        console.warn('loginWechat secondary fetch failed', error)
        this.setData({ secondaryLoading: false })
        wx.showToast({ title: '部分数据加载较慢', icon: 'none' })
      })
    } catch (error) {
      this.setData({ loading: false })
      wx.showModal({
        title: '微信登录失败',
        content: error?.message || '请检查云函数部署、当前云环境和真机调试状态',
        showCancel: false,
      })
    }
  },

  onAvatarLoadError(e) {
    const avatarUrl = this.data.currentUser?.avatarSrc || this.data.currentUser?.avatarDisplayUrl || this.data.currentUser?.avatarUrl || ''
    console.warn('account avatar image load failed', { avatarUrl, detail: e?.detail })
    this.setData({ avatarLoadFailed: true })
  },

  onAvatarLoad() {
    if (this.data.avatarLoadFailed) {
      this.setData({ avatarLoadFailed: false })
    }
  },

  selectTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  openProblemDetail(e) {
    if (this.data.navigating) return
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
    wx.navigateTo({
      url: `/pages/problem-submit/index?id=${id}`,
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
        })
        wx.showToast({ title: '已退出', icon: 'success' })
      },
    })
  },
})
