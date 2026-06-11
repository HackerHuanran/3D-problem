const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'problem', label: '问题' },
  { key: 'knowledge', label: '知识' },
  { key: 'service', label: '服务' },
]

function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

function normalizeSubmission(item = {}) {
  const submissionType = item.submission_type || 'problem'
  const steps = Array.isArray(item.steps) ? item.steps : []
  const service = item.service || {}
  return {
    _id: item._id,
    id: item._id,
    userId: item.user_id || '',
    problemId: item.problem_id || item._id,
    title: item.title || service.studioName || '未命名投稿',
    subtitle: item.subtitle || '',
    description: item.description || service.description || '',
    category: item.category || '未分类',
    difficulty: item.difficulty || '常见',
    status: item.status || 'pending',
    statusText: item.status === 'published' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '待审核',
    image_url: item.image_url || '',
    submissionType,
    submissionTypeText: submissionType === 'knowledge' ? '知识投稿' : submissionType === 'service' ? '服务审核' : '问题投稿',
    service,
    service_id: item.service_id || '',
    studioName: service.studioName || item.studioName || '',
    machineModel: service.machineModel || item.machineModel || '',
    machineCount: service.machineCount || item.machineCount || '',
    contact: service.contact || item.contact || '',
    images: service.images || item.images || [],
    environmentImage: service.environmentImage || item.environmentImage || '',
    wechatQrImage: service.wechatQrImage || item.wechatQrImage || '',
    detailBlocks: item.detail_blocks || [],
    effectImages: item.effect_images || [],
    causes: item.causes || [],
    steps,
    solutions: item.solutions || steps.map((step, index) => ({
      step: step.step || index + 1,
      title: step.title || step.text || `步骤 ${index + 1}`,
      detail: step.detail || step.text || '',
      image: step.image || step.image_url || '',
    })),
    tips: item.tips || '',
  }
}

Page({
  data: {
    loading: false,
    opLoading: false,
    opTargetId: '',
    filter: 'all',
    filters: FILTERS.map((item) => ({ ...item, count: 0 })),
    submissions: [],
    filteredSubmissions: [],
    shouldRefresh: false,
  },

  onLoad(options = {}) {
    const filter = ['all', 'problem', 'knowledge', 'service'].includes(options.filter) ? options.filter : 'all'
    this.setData({ filter })
    this.guardAdmin()
  },

  onShow() {
    if (this.data.shouldRefresh) {
      this.setData({ shouldRefresh: false })
      this.loadSubmissions()
    }
  },

  async onPullDownRefresh() {
    await this.loadSubmissions()
    wx.stopPullDownRefresh()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.loadSubmissions()
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async loadSubmissions() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      const db = getApp().getCloud().database()
      const { data } = await db.collection('user_problems')
        .orderBy('created_at', 'desc')
        .limit(200)
        .get()
      this.setSubmissions((data || []).map(normalizeSubmission))
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查 user_problems 集合权限',
        showCancel: false,
      })
      this.setSubmissions([])
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  setSubmissions(submissions = this.data.submissions, filter = this.data.filter) {
    const counts = submissions.reduce((acc, item) => {
      acc.all += 1
      if (item.submissionType === 'knowledge') acc.knowledge += 1
      else if (item.submissionType === 'service') acc.service += 1
      else acc.problem += 1
      return acc
    }, { all: 0, problem: 0, knowledge: 0, service: 0 })
    const filteredSubmissions = submissions.filter((item) => {
      if (filter === 'knowledge') return item.submissionType === 'knowledge'
      if (filter === 'service') return item.submissionType === 'service'
      if (filter === 'problem') return item.submissionType !== 'knowledge' && item.submissionType !== 'service'
      return true
    })
    this.setData({
      submissions,
      filter,
      filteredSubmissions,
      filters: FILTERS.map((item) => ({ ...item, count: counts[item.key] || 0 })),
    })
  },

  switchFilter(event) {
    const filter = event.currentTarget.dataset.filter || 'all'
    this.setSubmissions(this.data.submissions, filter)
  },

  setOperation(id = '') {
    this.setData({ opLoading: true, opTargetId: id })
  },

  clearOperation() {
    this.setData({ opLoading: false, opTargetId: '' })
  },

  findSubmission(id = '') {
    return this.data.submissions.find((item) => item.id === id) || null
  },

  patchSubmission(id = '', patch = {}) {
    const nextStatus = patch.status || ''
    const submissions = this.data.submissions.map((item) => (
      item.id === id
        ? {
            ...item,
            ...patch,
            statusText: nextStatus === 'published' ? '已通过' : nextStatus === 'rejected' ? '已拒绝' : item.statusText,
          }
        : item
    ))
    this.setSubmissions(submissions, this.data.filter)
  },

  removeSubmissionFromList(id = '') {
    this.setSubmissions(this.data.submissions.filter((item) => item.id !== id), this.data.filter)
  },

  viewSubmission(event) {
    const id = event.currentTarget.dataset.id || ''
    if (!id) return
    this.setData({ shouldRefresh: true })
    wx.navigateTo({
      url: `/pages/submission-edit/index?id=${id}`,
    })
  },

  async approveSubmission(event) {
    const item = this.findSubmission(event.currentTarget.dataset.id)
    if (!item?.id || !item.problemId) return
    if (item.status === 'published') {
      wx.showToast({ title: '已通过', icon: 'none' })
      return
    }
    this.setOperation(item.id)
    wx.showLoading({ title: '处理中', mask: true })
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminApproveSubmission',
          submissionId: item.id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '审核失败')
      }
      const pointsResult = result.pointsResult || {}
      wx.showToast({
        title: pointsResult?.awarded ? '已通过并加积分' : '已通过',
        icon: 'success',
      })
      this.patchSubmission(item.id, {
        status: 'published',
        ...(result.submission || {}),
      })
    } catch (error) {
      wx.showModal({
        title: '审核失败',
        content: error?.message || '请检查数据库权限',
        showCancel: false,
      })
    } finally {
      this.clearOperation()
      wx.hideLoading()
    }
  },

  async upsertProblem(item) {
    const db = getApp().getCloud().database()
      const payload = {
        category: item.category,
        difficulty: item.difficulty,
        title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      causes: item.causes || [],
      solutions: item.solutions || [],
      tips: item.tips || '',
        image_url: item.image_url || '',
        source: 'user_submitted',
        source_submission_id: item.id,
        submission_id: item.id,
        user_problem_id: item.id,
        updated_at: db.serverDate(),
      }
    const { data } = await db.collection('problems').where({ problem_id: item.problemId }).limit(1).get()
    if (data?.length) {
      await db.collection('problems').doc(data[0]._id).update({ data: payload })
      return
    }
    await db.collection('problems').add({
      data: {
        problem_id: item.problemId,
        ...payload,
        created_at: db.serverDate(),
      },
    })
  },

  async publishServiceSubmission(item) {
    const db = getApp().getCloud().database()
    const service = item.service || {}
    const studioName = String(service.studioName || item.studioName || item.title || '').trim()
    const machineModel = String(service.machineModel || item.machineModel || '').trim()
    const machineCount = String(service.machineCount || item.machineCount || '').trim()
    const description = String(service.description || item.description || '').trim()
    const contact = String(service.contact || item.contact || '').trim()
    const images = Array.isArray(service.images || item.images) ? (service.images || item.images).filter(Boolean).slice(0, 3) : []
    const wechatQrImage = String(service.wechatQrImage || item.wechatQrImage || '').trim()
    if (!studioName || !machineModel || !machineCount || !description) {
      throw new Error('服务入驻信息不完整，无法通过')
    }
    const payload = {
      studioName,
      machineModel,
      machineCount,
      contact,
      description,
      images,
      environmentImage: service.environmentImage || item.environmentImage || images[0] || '',
      wechatQrImage,
      source: 'user_submitted',
      submission_id: item.id,
      user_id: item.userId || '',
      updated_at: db.serverDate(),
    }
    const { data } = await db.collection('studio_services').where({ submission_id: item.id }).limit(1).get()
    if (data?.length) {
      await db.collection('studio_services').doc(data[0]._id).update({ data: payload })
      return data[0]._id
    }
    const created = await db.collection('studio_services').add({
      data: {
        ...payload,
        created_at: db.serverDate(),
      },
    })
    return created?._id || ''
  },

  async awardPointsForSubmission(item) {
    if (!item?.id || !item?.userId) return null
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'awardSubmissionPoints',
          targetUserId: item.userId,
          submissionId: item.id,
          submissionType: item.submissionType || 'problem',
        },
      })
      const result = res?.result || {}
      if (result?.ok === false) throw new Error(result?.error || '积分发放失败')
      return result
    } catch (error) {
      console.warn('award approved submission points failed', error)
      return { ok: false, error: error?.message || '积分发放失败' }
    }
  },

  async rejectSubmission(event) {
    const item = this.findSubmission(event.currentTarget.dataset.id)
    if (!item?.id) return
    this.setOperation(item.id)
    wx.showLoading({ title: '处理中', mask: true })
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminRejectSubmission',
          submissionId: item.id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '操作失败')
      }
      wx.showToast({ title: '已拒绝', icon: 'success' })
      this.patchSubmission(item.id, { status: 'rejected' })
    } catch (error) {
      wx.showModal({
        title: '操作失败',
        content: error?.message || '请检查数据库权限',
        showCancel: false,
      })
    } finally {
      this.clearOperation()
      wx.hideLoading()
    }
  },

  deleteSubmission(event) {
    const item = this.findSubmission(event.currentTarget.dataset.id)
    if (!item?.id) return
    wx.showModal({
      title: '删除投稿',
      content: item.status === 'published' ? '删除后会同时移除已发布内容，确定继续吗？' : '删除后不可恢复，确定继续吗？',
      success: async (res) => {
        if (!res.confirm) return
        await this.confirmDeleteSubmission(item)
      },
    })
  },

  async confirmDeleteSubmission(item) {
    this.setOperation(item.id)
    wx.showLoading({ title: '删除中', mask: true })
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminDeleteSubmission',
          submissionId: item.id,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '删除失败')
      }
      wx.showToast({ title: '已删除', icon: 'success' })
      this.removeSubmissionFromList(item.id)
    } catch (error) {
      wx.showModal({
        title: '删除失败',
        content: error?.message || '请检查数据库权限',
        showCancel: false,
      })
    } finally {
      this.clearOperation()
      wx.hideLoading()
    }
  },
})
