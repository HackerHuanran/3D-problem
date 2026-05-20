const { getProblemDetail, getRelatedProblems } = require('../../utils/problem-service')
const { getCurrentUser, ensureUser, fetchFavorites, toggleFavorite, recordHistory } = require('../../utils/user-service')

Page({
  data: {
    id: '',
    detail: null,
    related: [],
    currentUser: null,
    isFav: false,
    loading: true,
  },

  async onLoad(query) {
    const id = query.id || ''
    this.setData({ id, loading: true })
    try {
      const user = await getCurrentUser()
      const detail = await getProblemDetail(id)
      const related = await getRelatedProblems(detail)
      const favorites = await fetchFavorites(user?.id)
      if (user?.id) {
        await recordHistory(user.id, id)
      }

      this.setData({
        currentUser: user,
        detail,
        related,
        isFav: favorites.includes(id),
        loading: false,
      })
    } catch (error) {
      console.error('problem detail load failed', error)
      this.setData({ loading: false })
      wx.showToast({ title: '详情加载失败', icon: 'none' })
    }
  },

  async toggleFavorite() {
    let user = this.data.currentUser
    if (!user?.id) {
      user = await ensureUser()
    }
    if (!user?.id) {
      wx.showToast({ title: '微信登录暂不可用，请稍后再试', icon: 'none' })
      return
    }
    const next = await toggleFavorite(user.id, this.data.id)
    this.setData({ currentUser: user, isFav: next })
    wx.showToast({ title: next ? '已收藏' : '已取消', icon: 'success' })
  },

  openRelated(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },
})
