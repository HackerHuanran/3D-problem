const {
  getCurrentUser,
  requireLoginForAction,
  fetchFavoriteProblems,
  fetchHistoryProblems,
  fetchMyProblemSubmissions,
} = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

Page({
  data: {
    type: 'favorites',
    title: '我的收藏',
    subtitle: '按最近记录展示',
    items: [],
    loading: false,
    navigating: false,
  },

  onLoad(query) {
    const type = query?.type || 'favorites'
    const titleMap = {
      favorites: '我的收藏',
      history: '最近浏览',
      submissions: '我的投稿',
    }
    const subtitleMap = {
      favorites: '按最近收藏展示',
      history: '按最近浏览展示',
      submissions: '按最新投稿展示',
    }
    const title = titleMap[type] || '我的列表'
    wx.setNavigationBarTitle({ title })
    this.setData({
      type,
      title,
      subtitle: subtitleMap[type] || '按最新记录展示',
    })
  },

  async onShow() {
    await this.loadList()
  },

  async loadList() {
    let user = await getCurrentUser()
    if (!user?.id) {
      const message = this.data.type === 'favorites'
        ? '请先登录后查看收藏'
        : this.data.type === 'history'
        ? '请先登录后查看浏览记录'
        : '请先登录后查看投稿'
      user = await requireLoginForAction(message)
    }
    if (!user?.id) {
      this.setData({ items: [] })
      return
    }
    this.setData({ loading: true })
    showAppLoading('加载中')
    try {
      let items = []
      if (this.data.type === 'favorites') {
        items = await fetchFavoriteProblems(user.id)
      } else if (this.data.type === 'history') {
        items = await fetchHistoryProblems(user.id)
      } else {
        items = await fetchMyProblemSubmissions(user.id, { force: true })
      }
      this.setData({ items: items || [] })
    } catch (error) {
      console.warn('load account list failed', error)
      this.setData({ items: [] })
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      hideAppLoading()
    }
  },

  async openItem(e) {
    if (this.data.navigating) return
    const item = this.data.items.find((row) => row.id === e.currentTarget.dataset.id)
    if (!item) return
    if (this.data.type !== 'submissions') {
      const user = await requireLoginForAction('请先登录后查看详情')
      if (!user?.id) return
    }
    this.setData({ navigating: true })
    showAppLoading('正在打开')
    let url = ''
    if (this.data.type === 'submissions') {
      url = item.submissionType === 'service'
        ? `/pages/service-submit/index?id=${item.id}`
        : item.submissionType === 'knowledge'
        ? `/pages/knowledge-submit/index?id=${item.id}`
        : `/pages/problem-submit/index?id=${item.id}`
    } else {
      url = `/pages/problem-detail/index?id=${item.id}`
    }
    wx.navigateTo({
      url,
      complete: () => {
        this.setData({ navigating: false })
        hideAppLoading()
      },
    })
  },

  editSubmission(e) {
    const id = e.currentTarget.dataset.id
    if (!id || this.data.type !== 'submissions') return
    if (e?.stopPropagation) e.stopPropagation()
    const item = this.data.items.find((row) => row.id === id)
    if (!item || this.data.navigating) return
    this.setData({ navigating: true })
    showAppLoading('正在打开')
    wx.navigateTo({
      url: item.submissionType === 'service'
        ? `/pages/service-submit/index?id=${id}`
        : item.submissionType === 'knowledge'
        ? `/pages/knowledge-submit/index?id=${id}`
        : `/pages/problem-submit/index?id=${id}`,
      complete: () => {
        this.setData({ navigating: false })
        hideAppLoading()
      },
    })
  },
})
