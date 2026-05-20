const {
  getCurrentUser,
  ensureUser,
  logoutCurrentUser,
  fetchFavorites,
  fetchHistory,
  fetchFavoriteProblems,
  fetchHistoryProblems,
  fetchMyProblemSubmissions,
  fetchMyMarketPosts,
} = require('../../utils/user-service')

Page({
  data: {
    currentUser: null,
    favoriteCount: 0,
    historyCount: 0,
    submissionCount: 0,
    marketCount: 0,
    loading: false,
    activeTab: 'favorites',
    favoriteProblems: [],
    historyProblems: [],
    problemSubmissions: [],
    marketPosts: [],
    secondaryLoading: false,
    marketMissingCollection: '',
    marketLoadError: '',
  },

  async onLoad() {
    await this.loadAccountData()
  },

  async onShow() {
    await this.loadAccountData()
  },

  async loadAccountData() {
    const user = await getCurrentUser()
    this.setData({ currentUser: user })
    if (!user?.id) return

    const [favorites, history] = await Promise.all([
      fetchFavorites(user.id),
      fetchHistory(user.id),
    ])

    this.setData({
      favoriteCount: favorites.length,
      historyCount: history.length,
      secondaryLoading: true,
    })

    Promise.all([
      fetchFavoriteProblems(user.id),
      fetchHistoryProblems(user.id),
      fetchMyProblemSubmissions(user.id),
      fetchMyMarketPosts(user.id),
    ]).then(([favoriteProblems, historyProblems, problemSubmissions, marketResult]) => {
        this.setData({
          submissionCount: problemSubmissions.length,
          marketCount: (marketResult.list || []).length,
          favoriteProblems,
          historyProblems,
          problemSubmissions,
          marketPosts: marketResult.list || [],
          marketMissingCollection: marketResult.missingCollection || '',
          marketLoadError: marketResult.error || '',
          secondaryLoading: false,
        })
      }).catch((error) => {
        console.warn('loadAccountData secondary fetch failed', error)
        this.setData({ secondaryLoading: false })
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
      } catch (profileError) {
        this.setData({ loading: false })
        if (profileError?.errMsg && !String(profileError.errMsg).includes('cancel')) {
          wx.showToast({ title: '获取微信资料失败', icon: 'none' })
        }
        return
      }

      const user = await ensureUser(profile)
      if (!user?.id) {
        this.setData({ loading: false })
        wx.showToast({ title: '微信登录失败，请稍后重试', icon: 'none' })
        return
      }

      const [favorites, history] = await Promise.all([
        fetchFavorites(user.id),
        fetchHistory(user.id),
      ])

      this.setData({
        currentUser: user,
        favoriteCount: favorites.length,
        historyCount: history.length,
        loading: false,
        secondaryLoading: true,
      })

      wx.showToast({
        title: user.profileSynced === false ? '登录成功，资料同步中' : '登录成功',
        icon: user.profileSynced === false ? 'none' : 'success',
      })

      Promise.all([
        fetchFavoriteProblems(user.id),
        fetchHistoryProblems(user.id),
        fetchMyProblemSubmissions(user.id),
        fetchMyMarketPosts(user.id),
      ]).then(([favoriteProblems, historyProblems, problemSubmissions, marketResult]) => {
        this.setData({
          submissionCount: problemSubmissions.length,
          marketCount: (marketResult.list || []).length,
          favoriteProblems,
          historyProblems,
          problemSubmissions,
          marketPosts: marketResult.list || [],
          marketMissingCollection: marketResult.missingCollection || '',
          marketLoadError: marketResult.error || '',
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

  selectTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  openProblemDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },

  openMarketDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/market-detail/index?id=${id}` })
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
          favoriteCount: 0,
          historyCount: 0,
          submissionCount: 0,
          marketCount: 0,
          favoriteProblems: [],
          historyProblems: [],
          problemSubmissions: [],
          marketPosts: [],
          secondaryLoading: false,
          marketMissingCollection: '',
          marketLoadError: '',
          activeTab: 'favorites',
        })
        wx.showToast({ title: '已退出', icon: 'success' })
      },
    })
  },
})
