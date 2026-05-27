const { getCurrentUser, submitUserFeedback } = require('../../utils/user-service')

Page({
  data: {
    currentUser: null,
    type: '建议',
    title: '',
    content: '',
    submitting: false,
    types: ['建议', '投诉', '问题反馈'],
  },

  async onLoad() {
    const user = await getCurrentUser()
    this.setData({ currentUser: user })
  },

  onTypeTap(e) {
    const type = e.currentTarget.dataset.type
    if (!type) return
    this.setData({ type })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  async submit() {
    if (this.data.submitting) return
    const title = String(this.data.title || '').trim()
    const content = String(this.data.content || '').trim()
    const user = this.data.currentUser || await getCurrentUser()

    if (!user?.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!title) {
      wx.showToast({ title: '请填写标题', icon: 'none' })
      return
    }
    if (!content) {
      wx.showToast({ title: '请填写内容', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await submitUserFeedback({
        userId: user.id,
        type: this.data.type,
        title,
        content,
      })
      wx.showToast({ title: '已提交', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 700)
    } catch (error) {
      console.warn('submit feedback failed', error)
      wx.showModal({
        title: '提交失败',
        content: error?.message || '请检查 user_feedback 集合是否已创建',
        showCancel: false,
      })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
