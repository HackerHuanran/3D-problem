const {
  getCurrentUser,
  getCurrentProfile,
  fetchAdminFeedback,
  markFeedbackResolved,
} = require('../../utils/user-service')
const { listProblems, clearProblemCache, clearProblemCaches } = require('../../utils/problem-service')

Page({
  data: {
    currentUser: null,
    isAdmin: false,
    section: 'submissions',
    loading: false,
    loadingMore: false,
    opLoading: false,
    opAction: '',
    opTargetId: '',
    submissions: [],
    feedbackList: [],
    problems: [],
    problemPage: 1,
    problemPageSize: 10,
    problemHasMore: true,
    query: '',
  },

  async onShow() {
    await this.loadAdminState()
  },

  async loadAdminState() {
    this.setData({ loading: true, opLoading: false, opAction: '', opTargetId: '' })
    try {
      const user = await getCurrentUser()
      const profile = await getCurrentProfile()
      const isAdmin = !!(user?.isAdmin || profile?.isAdmin || ['admin', 'administrator', 'root'].includes(String(profile?.role || '').trim().toLowerCase()))
      if (!user?.id || !isAdmin) {
        this.setData({ currentUser: user, isAdmin: false })
        return
      }

      this.setData({ currentUser: user, isAdmin: true })
      await Promise.all([
        this.loadSubmissions(),
        this.loadFeedback(),
        this.loadProblems({ reset: true }),
      ])
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadSubmissions() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('user_problems')
        .orderBy('created_at', 'desc')
        .limit(200)
        .get()
      const submissions = (data || []).map((item) => ({
        _id: item._id,
        id: item._id,
        problemId: item.problem_id || item._id,
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        category: item.category || '未分类',
        difficulty: item.difficulty || '常见',
        status: item.status || 'pending',
        statusText: item.status === 'published' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '待审核',
        image_url: item.image_url || '',
        causes: item.causes || [],
        steps: item.steps || [],
        solutions: item.solutions || (item.steps || []).map((step, index) => ({
          step: step.step || index + 1,
          title: step.title || step.text || `步骤 ${index + 1}`,
          detail: step.detail || step.text || '',
        })),
        tips: item.tips || '',
      }))
      this.setData({ submissions })
    } catch (error) {
      console.warn('loadSubmissions failed', error)
      this.setData({ submissions: [] })
    }
  },

  async loadFeedback() {
    try {
      const feedbackList = await fetchAdminFeedback({ page: 1, pageSize: 100 })
      this.setData({ feedbackList })
    } catch (error) {
      console.warn('loadFeedback failed', error)
      this.setData({ feedbackList: [] })
    }
  },

  async loadProblems({ reset = false } = {}) {
    if (!reset && (!this.data.problemHasMore || this.data.loadingMore || this.data.loading)) {
      return
    }
    const nextPage = reset ? 1 : this.data.problemPage
    this.setData(reset ? { loading: true } : { loadingMore: true })
    try {
      const items = await listProblems({
        page: nextPage,
        pageSize: this.data.problemPageSize,
      })
      const problems = reset
        ? (items || [])
        : this.data.problems.concat(items || [])
      this.setData({
        problems,
        problemPage: nextPage + 1,
        problemHasMore: (items || []).length === this.data.problemPageSize,
      })
    } catch (error) {
      console.warn('loadProblems failed', error)
      if (reset) {
        this.setData({ problems: [], problemHasMore: false })
      }
    } finally {
      this.setData({
        loading: false,
        loadingMore: false,
      })
    }
  },

  refreshProblems() {
    clearProblemCaches()
    this.loadProblems({ reset: true })
  },

  setOperationState(opAction, opTargetId) {
    this.setData({
      opLoading: true,
      opAction,
      opTargetId,
    })
  },

  clearOperationState() {
    this.setData({
      opLoading: false,
      opAction: '',
      opTargetId: '',
    })
  },

  switchSection(e) {
    const section = e.currentTarget.dataset.section
    this.setData({ section })
    if (section === 'problems' && !this.data.problems.length) {
      this.loadProblems({ reset: true })
    }
    if (section === 'feedback' && !this.data.feedbackList.length) {
      this.loadFeedback()
    }
  },

  openProblemSubmit() {
    wx.navigateTo({ url: '/pages/problem-submit/index' })
  },

  async approveSubmission(e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.submissions.find((row) => row.id === itemId)
    if (!item?.id || !item?.problemId) return
    if (item.status === 'published') {
      wx.showToast({ title: '该投稿已通过', icon: 'none' })
      return
    }
    const db = wx.cloud.database()
    this.setOperationState('approve', item.id)
    wx.showLoading({ title: '正在审核' })
    try {
      await db.collection('user_problems').doc(item.id).update({
        data: {
          status: 'published',
          updated_at: db.serverDate(),
        },
      })
      const payload = {
        category: item.category,
        difficulty: item.difficulty,
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        causes: item.causes || [],
        solutions: (item.solutions && item.solutions.length)
          ? item.solutions
          : (item.steps || []).map((step, index) => ({
              step: step.step || index + 1,
              title: step.title || step.text || `步骤 ${index + 1}`,
              detail: step.detail || step.text || '',
            })),
        tips: item.tips || '',
        image_url: item.image_url || '',
        source: 'user_submitted',
      }
      const { data } = await db.collection('problems').where({ problem_id: item.problemId }).limit(1).get()
      if (data?.length) {
        await db.collection('problems').doc(data[0]._id).update({
          data: {
            ...payload,
            updated_at: db.serverDate(),
          },
        })
      } else {
        await db.collection('problems').add({
          data: {
            problem_id: item.problemId,
            ...payload,
            created_at: db.serverDate(),
            updated_at: db.serverDate(),
          },
        })
      }
      wx.showToast({ title: '已通过', icon: 'success' })
      clearProblemCaches()
      await this.loadSubmissions()
      await this.loadProblems({ reset: true })
    } catch (error) {
      wx.showModal({
        title: '审核失败',
        content: error?.message || '请检查数据库集合',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
      wx.hideLoading()
    }
  },

  async rejectSubmission(e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.submissions.find((row) => row.id === itemId)
    if (!item?.id) return
    const db = wx.cloud.database()
    this.setOperationState('reject', item.id)
    wx.showLoading({ title: '正在处理' })
    try {
      await db.collection('user_problems').doc(item.id).update({
        data: {
          status: 'rejected',
          updated_at: db.serverDate(),
        },
      })
      wx.showToast({ title: '已拒绝', icon: 'success' })
      clearProblemCaches()
      await this.loadSubmissions()
    } catch (error) {
      wx.showModal({
        title: '操作失败',
        content: error?.message || '请检查数据库集合',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
      wx.hideLoading()
    }
  },

  deleteSubmission(e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.submissions.find((row) => row.id === itemId)
    if (!item?.id) return

    wx.showModal({
      title: '删除投稿',
      content: item.status === 'published'
        ? '这条投稿已经通过，删除后会同时移除问题库里的对应问题，确定继续吗？'
        : '删除后不可恢复，确定继续吗？',
      success: async (res) => {
        if (!res.confirm) return
        await this.confirmDeleteSubmission(item)
      },
    })
  },

  viewFeedback(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.feedbackList.find((row) => row.id === id)
    if (!item) return
    wx.showModal({
      title: `${item.type}：${item.title}`,
      content: `用户：${item.userName}\n状态：${item.statusText}\n\n${item.content}`,
      showCancel: false,
      confirmText: '知道了',
    })
  },

  async resolveFeedback(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.feedbackList.find((row) => row.id === id)
    if (!item?.id) return
    if (item.status === 'resolved') {
      wx.showToast({ title: '已处理过', icon: 'none' })
      return
    }

    this.setOperationState('resolve-feedback', item.id)
    try {
      await markFeedbackResolved(item.id)
      wx.showToast({ title: '已标记处理', icon: 'success' })
      await this.loadFeedback()
    } catch (error) {
      wx.showModal({
        title: '操作失败',
        content: error?.message || '请检查数据库权限',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
    }
  },

  async confirmDeleteSubmission(item) {
    if (!item?.id) return
    const db = wx.cloud.database()
    this.setOperationState('delete', item.id)
    wx.showLoading({ title: '正在删除' })
    try {
      await db.collection('user_problems').doc(item.id).remove()
      clearProblemCache(item.problemId)

      if (item.problemId) {
        const { data } = await db.collection('problems').where({ problem_id: item.problemId }).limit(20).get()
        const rows = data || []
        for (const row of rows) {
          if (row?._id) {
            await db.collection('problems').doc(row._id).remove()
          }
        }
      }

      wx.showToast({ title: '已删除', icon: 'success' })
      clearProblemCaches()
      await this.loadSubmissions()
      await this.loadProblems({ reset: true })
    } catch (error) {
      wx.showModal({
        title: '删除失败',
        content: error?.message || '请检查数据库权限',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
      wx.hideLoading()
    }
  },

  async openProblemImagePicker(e) {
    const problemId = e.currentTarget.dataset.id
    const problem = this.data.problems.find((row) => row.id === problemId)
    if (!problem?.id) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (file) {
          await this.uploadProblemImage(problem, file)
        }
      },
    })
  },

  async uploadProblemImage(problem, file) {
    if (!problem?.id || !file) return
    const db = wx.cloud.database()
    wx.showLoading({ title: '上传中' })
    try {
      const ext = (file.split('.').pop() || 'jpg').toLowerCase()
      const cloudPath = `problem-covers/${problem.id}/${Date.now()}.${ext}`
      const upload = await wx.cloud.uploadFile({
        cloudPath,
        filePath: file,
      })
      const { data } = await db.collection('problem_meta').where({ problem_id: problem.id }).limit(1).get()
      if (data?.length) {
        await db.collection('problem_meta').doc(data[0]._id).update({
          data: {
            file_id: upload.fileID,
            cloud_path: cloudPath,
            image_url: upload.fileID,
          },
        })
      } else {
        await db.collection('problem_meta').add({
          data: {
            problem_id: problem.id,
            file_id: upload.fileID,
            cloud_path: cloudPath,
            image_url: upload.fileID,
          },
        })
      }
      wx.showToast({ title: '已上传', icon: 'success' })
      clearProblemCache(problem.id)
      clearProblemCaches()
      await this.loadProblems({ reset: true })
    } catch (error) {
      wx.showModal({
        title: '上传失败',
        content: error?.message || '请检查图片权限和云环境',
        showCancel: false,
      })
    } finally {
      wx.hideLoading()
    }
  },

  openProblemDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.setOperationState('view-problem', id)
    wx.showLoading({ title: '正在打开' })
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${id}`,
      fail: () => this.clearOperationState(),
    })
  },

  openSubmissionDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.setOperationState('view', id)
    wx.showLoading({ title: '正在打开' })
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${id}`,
      fail: () => this.clearOperationState(),
    })
  },

  async onReachBottom() {
    if (this.data.section !== 'problems') return
    await this.loadProblems()
  },

  setDataForItem(item, patch) {
    const submissions = this.data.submissions.map((row) => (row._id === item._id ? { ...row, ...patch } : row))
    this.setData({ submissions })
  },
})
