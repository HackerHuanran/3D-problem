const { ensureUser } = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

Page({
  data: {
    submissionId: '',
    title: '',
    description: '',
    coverImage: '',
    causes: [{ text: '' }],
    steps: [{ text: '' }],
    submitting: false,
    pageTitle: '分享打印问题',
  },

  async onLoad(query) {
    wx.hideLoading()
    try {
      await ensureUser()
    } catch (error) {
      console.warn('problem-submit ensureUser failed', error)
    }

    const submissionId = query?.id || ''
    if (!submissionId) return

    const db = wx.cloud.database()
    showAppLoading('加载中')
    try {
      const { data } = await db.collection('user_problems').where({ _id: submissionId }).limit(1).get()
      const item = data?.[0]
      if (!item || item.deleted === true || item.is_deleted === true || ['deleted', 'removed'].includes(String(item.status || '').trim().toLowerCase())) {
        wx.showToast({ title: '投稿已被删除', icon: 'none' })
        setTimeout(() => {
          wx.navigateBack({ delta: 1 })
        }, 600)
        return
      }
      this.setData({
        submissionId,
        title: item.title || '',
        description: item.description || '',
        coverImage: item.image_url || '',
        causes: (item.causes && item.causes.length)
          ? item.causes.map((text) => ({ text: String(text || '') }))
          : [{ text: '' }],
        steps: (item.steps && item.steps.length)
          ? item.steps.map((step) => ({ text: step.text || step.detail || step.title || '' }))
          : (item.solutions && item.solutions.length)
            ? item.solutions.map((step) => ({ text: step.detail || step.title || '' }))
            : [{ text: '' }],
        pageTitle: '修改投稿',
      })
      wx.setNavigationBarTitle({ title: '修改投稿' })
    } catch (error) {
      console.warn('load submission for edit failed', error)
    } finally {
      hideAppLoading()
    }
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  addCause() {
    this.setData({
      causes: [...this.data.causes, { text: '' }],
    })
  },

  removeCause(e) {
    const index = e.currentTarget.dataset.index
    const causes = this.data.causes.slice()
    if (causes.length <= 1) return
    causes.splice(index, 1)
    this.setData({ causes })
  },

  onCauseInput(e) {
    const index = e.currentTarget.dataset.index
    const causes = this.data.causes.slice()
    causes[index] = { text: e.detail.value }
    this.setData({ causes })
  },

  addStep() {
    this.setData({
      steps: [...this.data.steps, { text: '' }],
    })
  },

  removeStep(e) {
    const index = e.currentTarget.dataset.index
    const steps = this.data.steps.slice()
    if (steps.length <= 1) return
    steps.splice(index, 1)
    this.setData({ steps })
  },

  onStepInput(e) {
    const index = e.currentTarget.dataset.index
    const steps = this.data.steps.slice()
    steps[index] = { text: e.detail.value }
    this.setData({ steps })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (file?.tempFilePath) {
          this.setData({ coverImage: file.tempFilePath })
        }
      },
    })
  },

  async submit() {
    if (this.data.submitting) return
    const title = String(this.data.title || '').trim()
    const description = String(this.data.description || '').trim()
    const causes = (this.data.causes || [])
      .map((item) => String(item.text || '').trim())
      .filter(Boolean)
    const steps = (this.data.steps || [])
      .map((item) => String(item.text || '').trim())
      .filter(Boolean)

    if (!title) {
      wx.showToast({ title: '请填写问题标题', icon: 'none' })
      return
    }
    if (!description) {
      wx.showToast({ title: '请填写问题描述', icon: 'none' })
      return
    }
    if (!steps.length) {
      wx.showToast({ title: '至少填写一个解决步骤', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    showAppLoading(this.data.submissionId ? '保存中' : '提交中')
    try {
      const user = await ensureUser()
      const db = wx.cloud.database()
      let imageUrl = this.data.coverImage || ''
      if (this.data.coverImage) {
        const isRemoteImage = String(this.data.coverImage).startsWith('http') || String(this.data.coverImage).startsWith('cloud://')
        if (!isRemoteImage) {
          const ext = (this.data.coverImage.split('.').pop() || 'jpg').toLowerCase()
          const filePath = `problem-submits/${Date.now()}.${ext}`
          const upload = await wx.cloud.uploadFile({
            cloudPath: filePath,
            filePath: this.data.coverImage,
          })
          imageUrl = upload.fileID || ''
        }
      }

      const payload = {
        user_id: user.id,
        title,
        subtitle: description.slice(0, 80),
        description,
        image_url: imageUrl,
        causes,
        steps: steps.map((text, index) => ({ step: index + 1, text })),
        solutions: steps.map((text, index) => ({
          step: index + 1,
          title: `步骤 ${index + 1}`,
          detail: text,
        })),
        tips: '',
        submission_type: 'problem',
        status: 'pending',
        updated_at: db.serverDate(),
      }

      if (this.data.submissionId) {
        await db.collection('user_problems').doc(this.data.submissionId).update({
          data: payload,
        })
      } else {
        await db.collection('user_problems').add({
          data: {
            ...payload,
            created_at: db.serverDate(),
          },
        })
      }
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
    } catch (error) {
      console.warn('submit problem failed', error)
      wx.showModal({
        title: '提交失败',
        content: error?.message || '请检查云函数和数据库集合是否已创建',
        showCancel: false,
      })
    } finally {
      this.setData({ submitting: false })
      hideAppLoading()
    }
  },
})
