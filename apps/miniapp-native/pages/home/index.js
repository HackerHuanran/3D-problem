const { listProblems, getProblemDetail } = require('../../utils/problem-service')
const { getCurrentUser, fetchFavorites, fetchHistory } = require('../../utils/user-service')

Page({
  data: {
    query: '',
    activeCategory: '全部',
    categories: ['全部', '新手', '进阶', '维护', '材料', '树脂'],
    problems: [],
    currentUser: null,
    favoriteMap: {},
    historyProblems: [],
    loading: false,
  },

  async onLoad() {
    this.setData({ loading: true })
    try {
      const user = await getCurrentUser()
      const [problems, favorites, history] = await Promise.all([
        listProblems({ page: 1, pageSize: 12 }),
        fetchFavorites(user?.id),
        fetchHistory(user?.id),
      ])

      const historyProblems = []
      for (const row of history) {
        const detail = await getProblemDetail(row.problem_id)
        if (detail) historyProblems.push(detail)
      }

      this.setData({
        currentUser: user,
        problems,
        favoriteMap: favorites.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
        historyProblems,
        loading: false,
      })
    } catch (error) {
      console.error('home onLoad failed', error)
      this.setData({ loading: false })
      wx.showToast({ title: '首页加载失败', icon: 'none' })
    }
  },

  async onShow() {
    const user = await getCurrentUser()
    const [favorites, history] = await Promise.all([
      fetchFavorites(user?.id),
      fetchHistory(user?.id),
    ])

    const historyProblems = []
    for (const row of history) {
      const detail = await getProblemDetail(row.problem_id)
      if (detail) historyProblems.push(detail)
    }

    this.setData({
      currentUser: user,
      favoriteMap: favorites.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
      historyProblems,
    })
  },

  async refreshProblems() {
    const problems = await listProblems({
      query: this.data.query,
      category: this.data.activeCategory,
      page: 1,
      pageSize: 12,
    })
    this.setData({ problems })
  },

  onQueryInput(e) {
    this.setData({ query: e.detail.value })
    this.refreshProblems()
  },

  selectCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.category })
    this.refreshProblems()
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },

  goDiagnosis() {
    wx.navigateTo({ url: '/pages/diagnosis/index' })
  },

  goAccount() {
    wx.navigateTo({ url: '/pages/account/index' })
  },
})
