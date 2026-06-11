const TODO_CARDS = [
  {
    key: 'submissions',
    title: '投稿审核',
    desc: '问题、知识和服务',
    collection: 'user_problems',
    where: { status: 'pending' },
  },
  {
    key: 'feedback',
    title: '用户反馈',
    desc: '投诉与建议',
    collection: 'user_feedback',
    where: { status: 'pending' },
  },
  {
    key: 'orders',
    title: '兑换订单',
    desc: '积分商品待处理',
    collection: 'reward_orders',
    where: { status: 'pending' },
  },
  {
    key: 'problems',
    title: '问题管理',
    desc: '问题图片与内容',
    collection: 'problems',
    where: {},
  },
  {
    key: 'announcements',
    title: '公告通知',
    desc: '新功能和重要提醒',
    collection: 'app_announcements',
    where: {},
  },
  {
    key: 'rewardGoods',
    title: '积分商品',
    desc: '兑换商品上架管理',
    collection: 'reward_goods',
    where: {},
  },
  {
    key: 'points',
    title: '积分调整',
    desc: '增减用户积分',
    collection: 'profiles',
    where: {},
  },
]

function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

Page({
  data: {
    loading: false,
    user: null,
    cards: TODO_CARDS.map((item) => ({ ...item, count: 0, countText: '0' })),
  },

  onLoad() {
    this.guardAdmin()
  },

  onShow() {
    this.guardAdmin()
  },

  async onPullDownRefresh() {
    await this.loadDashboard()
    wx.stopPullDownRefresh()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      getApp().globalData.currentUser = null
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.setData({ user })
    this.loadDashboard()
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async loadDashboard() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      await getApp().ensureCloud()
      const cards = await Promise.all(TODO_CARDS.map((card) => this.loadCardCount(card)))
      this.setData({ cards })
    } catch (error) {
      wx.showToast({
        title: error?.message || '加载失败',
        icon: 'none',
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  async loadCardCount(card = {}) {
    const cloud = getApp().getCloud()
    const db = cloud.database()
    try {
      const res = await db.collection(card.collection).where(card.where || {}).count()
      const count = Number(res?.total || res?.count || 0)
      return {
        ...card,
        count,
        countText: count > 99 ? '99+' : String(count),
      }
    } catch (error) {
      console.warn('load dashboard count failed', card.key, error)
      return {
        ...card,
        count: 0,
        countText: '-',
      }
    }
  },

  openModule(event) {
    const key = event.currentTarget.dataset.key || ''
    if (key === 'submissions') {
      wx.navigateTo({
        url: '/pages/submissions/index?filter=all',
      })
      return
    }
    if (key === 'feedback') {
      wx.navigateTo({
        url: '/pages/feedback/index',
      })
      return
    }
    if (key === 'orders') {
      wx.navigateTo({
        url: '/pages/reward-orders/index',
      })
      return
    }
    if (key === 'problems') {
      wx.navigateTo({
        url: '/pages/problems/index',
      })
      return
    }
    if (key === 'announcements') {
      wx.navigateTo({
        url: '/pages/announcements/index',
      })
      return
    }
    if (key === 'rewardGoods') {
      wx.navigateTo({
        url: '/pages/reward-goods/index',
      })
      return
    }
    if (key === 'points') {
      wx.navigateTo({
        url: '/pages/points-adjust/index',
      })
      return
    }
    wx.showToast({
      title: key ? '模块正在迁移中' : '暂未开放',
      icon: 'none',
    })
  },

  refresh() {
    this.loadDashboard()
  },

})
