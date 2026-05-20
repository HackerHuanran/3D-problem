const { listProblems, getProblemDetail } = require('../../utils/problem-service')
const { getCurrentUser, fetchFavorites } = require('../../utils/user-service')

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (error) {
    return String(value || '')
  }
}

Page({
  data: {
    query: '',
    activeCategory: '全部',
    categories: ['全部', '新手', '进阶', '维护', '材料', '树脂'],
    problems: [],
    currentUser: null,
    favoriteMap: {},
    loading: false,
    loadingMore: false,
    hasMore: true,
  },

  async onLoad(options = {}) {
    this.pageIndex = 1
    this.pageSize = 12
    this.setData({ loading: true, hasMore: true, loadingMore: false })
    try {
      const query = safeDecode(options.q).trim()
      if (query) {
        this.setData({ query })
      }
      const user = await getCurrentUser()
      const [problems, favorites] = await Promise.all([
        listProblems({ query, category: '全部', page: 1, pageSize: this.pageSize }),
        fetchFavorites(user?.id),
      ])

      this.setData({
        currentUser: user,
        problems,
        favoriteMap: favorites.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
        loading: false,
        hasMore: !query && problems.length === this.pageSize,
      })
      this.pageIndex = 1
    } catch (error) {
      console.error('library onLoad failed', error)
      this.setData({ loading: false })
      wx.showToast({ title: '问题库加载失败', icon: 'none' })
    }
  },

  async onShow() {
    const user = await getCurrentUser()
    const favorites = await fetchFavorites(user?.id)

    this.setData({
      currentUser: user,
      favoriteMap: favorites.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    })
  },

  async loadProblems(reset = true) {
    if (reset) {
      this.pageIndex = 1
      this.setData({ loading: true, hasMore: true, loadingMore: false })
    }

    try {
      const problems = await listProblems({
        query: this.data.query,
        category: this.data.activeCategory,
        page: this.pageIndex,
        pageSize: this.pageSize,
      })

      const isSearchMode = Boolean(String(this.data.query || '').trim())
      this.setData({
        problems: reset ? problems : this.data.problems.concat(problems),
        hasMore: isSearchMode ? false : problems.length === this.pageSize,
      })
    } finally {
      this.setData({
        loading: false,
        loadingMore: false,
      })
    }
  },

  onQueryInput(e) {
    this.setData({ query: e.detail.value })
    this.loadProblems(true)
  },

  selectCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.category })
    this.loadProblems(true)
  },

  async onReachBottom() {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return
    if (String(this.data.query || '').trim()) return

    this.setData({ loadingMore: true })
    this.pageIndex += 1
    await this.loadProblems(false)
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },
})
