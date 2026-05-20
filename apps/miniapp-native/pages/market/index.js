const { listMarketPosts } = require('../../utils/market-service')

Page({
  data: {
    posts: [],
    loading: false,
    missingCollection: '',
    loadError: '',
  },

  async onLoad() {
    await this.refreshList()
  },

  async onShow() {
    await this.refreshList()
  },

  async refreshList() {
    this.setData({ loading: true })
    const result = await listMarketPosts({ status: '待解决', limit: 30 })
    this.setData({
      posts: result.list || [],
      missingCollection: result.missingCollection || '',
      loadError: result.error || '',
      loading: false,
    })
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/market-detail/index?id=${id}` })
  },
})
