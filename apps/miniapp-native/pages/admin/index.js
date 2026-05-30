const {
  getCurrentUser,
  getCurrentProfile,
  fetchAdminFeedback,
  markFeedbackResolved,
} = require('../../utils/user-service')
const { listProblems, clearProblemCache, clearProblemCaches } = require('../../utils/problem-service')

function normalizeServiceAsset(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    return String(
      value.fileID
      || value.fileId
      || value.cloudPath
      || value.cloud_path
      || value.url
      || value.src
      || value.path
      || value.tempFileURL
      || value.tempFileUrl
      || value.download_url
      || ''
    ).trim()
  }
  return String(value).trim()
}

function isLocalTempAsset(value = '') {
  const raw = String(value || '').trim()
  return raw.startsWith('wxfile://') || raw.startsWith('http://tmp/')
}

function isUploadedAsset(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (raw.startsWith('cloud://')) return true
  if (/^https?:\/\//i.test(raw) && !isLocalTempAsset(raw)) return true
  return false
}

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
    usageStats: [],
    usageSummary: {
      today: 0,
      yesterday: 0,
      total: 0,
    },
    usageTimeline: {
      today: [],
      yesterday: [],
    },
    problems: [],
    services: [],
    serviceForm: {
      id: '',
      studioName: '',
      machineModel: '',
      machineCount: '',
      contact: '',
      description: '',
      images: [],
      imageDisplays: [],
      wechatQrImage: '',
      wechatQrImageDisplay: '',
    },
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
        this.loadUsageStats(),
        this.loadProblems({ reset: true }),
        this.loadServices(),
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
        submissionType: item.submission_type || 'problem',
        detailBlocks: item.detail_blocks || [],
        effectImages: item.effect_images || [],
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

  async loadUsageStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'getUsageStats',
          days: 14,
        },
      })
      const result = res?.result || {}
      if (result?.ok === false) {
        throw new Error(result?.error || '加载使用统计失败')
      }
      this.setData({
        usageStats: Array.isArray(result.stats) ? result.stats : [],
        usageSummary: {
          today: Number(result.today || 0),
          yesterday: Number(result.yesterday || 0),
          total: Number(result.total || 0),
        },
        usageTimeline: {
          today: Array.isArray(result.todayTimeline) ? result.todayTimeline : [],
          yesterday: Array.isArray(result.yesterdayTimeline) ? result.yesterdayTimeline : [],
        },
      })
    } catch (error) {
      console.warn('loadUsageStats failed', error)
      this.setData({
        usageStats: [],
        usageSummary: {
          today: 0,
          yesterday: 0,
          total: 0,
        },
        usageTimeline: {
          today: [],
          yesterday: [],
        },
      })
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

  async loadServices() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('studio_services')
        .orderBy('updated_at', 'desc')
        .limit(100)
        .get()
      const services = await Promise.all((data || []).map((item) => this.normalizeServiceRecord(item)))
      this.setData({ services })
    } catch (error) {
      console.warn('loadServices failed', error)
      this.setData({ services: [] })
    }
  },

  async resolveCloudFile(value) {
    const raw = normalizeServiceAsset(value)
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      return res?.fileList?.[0]?.tempFileURL || res?.fileList?.[0]?.download_url || raw
    } catch (error) {
      console.warn('resolveCloudFile failed', error)
      return raw
    }
  },

  async resolveCloudFiles(list = []) {
    const rows = (list || []).map((item) => normalizeServiceAsset(item)).filter(Boolean)
    if (!rows.length) return []
    const cloudRows = rows.filter((item) => item.startsWith('cloud://'))
    const mappedUrls = {}
    if (cloudRows.length) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: cloudRows })
        ;(res?.fileList || []).forEach((item) => {
          if (item?.fileID) {
            mappedUrls[item.fileID] = item.tempFileURL || item.fileID
          }
        })
      } catch (error) {
        console.warn('resolve admin service images batch failed', error)
      }
    }
    const results = []
    for (const item of rows) {
      if (mappedUrls[item]) {
        results.push(mappedUrls[item])
        continue
      }
      if (!item.startsWith('cloud://')) {
        results.push(item)
        continue
      }
      const fallbackUrl = await this.resolveCloudFile(item)
      results.push(fallbackUrl || '')
    }
    return results
  },

  getServiceImages(item = {}) {
    if (Array.isArray(item.images) && item.images.length) {
      return item.images.map((row) => normalizeServiceAsset(row)).filter(Boolean).slice(0, 3)
    }
    if (item.environmentImage) {
      return [normalizeServiceAsset(item.environmentImage)].filter(Boolean)
    }
    return []
  },

  async normalizeServiceRecord(item = {}) {
    const images = this.getServiceImages(item)
    const imageDisplays = await this.resolveCloudFiles(images)
    const description = String(item.description || '').trim()
    const wechatQrImage = normalizeServiceAsset(item.wechatQrImage)
    const wechatQrImageDisplay = wechatQrImage ? await this.resolveCloudFile(wechatQrImage) : ''
    return {
      id: item._id,
      studioName: item.studioName || '',
      machineModel: item.machineModel || '',
      machineCount: item.machineCount || '',
      contact: item.contact || '',
      description,
      descriptionPreview: description.length > 40 ? `${description.slice(0, 40)}...` : description,
      images,
      imageDisplays,
      wechatQrImage,
      wechatQrImageDisplay,
      updatedAt: item.updated_at || item.created_at || null,
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
    if (section === 'analytics' && !this.data.usageStats.length) {
      this.loadUsageStats()
    }
    if (section === 'services' && !this.data.services.length) {
      this.loadServices()
    }
  },

  onServiceInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({
      [`serviceForm.${field}`]: e.detail.value,
    })
  },

  resetServiceForm() {
    this.setData({
      serviceForm: {
        id: '',
        studioName: '',
        machineModel: '',
        machineCount: '',
        contact: '',
        description: '',
        images: [],
        imageDisplays: [],
        wechatQrImage: '',
        wechatQrImageDisplay: '',
      },
    })
  },

  editService(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.services.find((row) => row.id === id)
    if (!item) return
    this.setData({
      serviceForm: {
        id: item.id,
        studioName: item.studioName || '',
        machineModel: item.machineModel || '',
        machineCount: item.machineCount || '',
        contact: item.contact || '',
        description: item.description || '',
        images: item.images || [],
        imageDisplays: item.imageDisplays || [],
        wechatQrImage: item.wechatQrImage || '',
        wechatQrImageDisplay: item.wechatQrImageDisplay || item.wechatQrImage || '',
      },
    })
  },

  chooseServiceImages() {
    const current = this.data.serviceForm?.images || []
    const remain = 3 - current.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 3 张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean)
        if (!files.length) return
        this.setData({
          'serviceForm.images': current.concat(files).slice(0, 3),
          'serviceForm.imageDisplays': (this.data.serviceForm.imageDisplays || []).concat(files).slice(0, 3),
        })
      },
    })
  },

  removeServiceImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index)) return
    const images = [...(this.data.serviceForm.images || [])]
    const imageDisplays = [...(this.data.serviceForm.imageDisplays || [])]
    images.splice(index, 1)
    imageDisplays.splice(index, 1)
    this.setData({
      'serviceForm.images': images,
      'serviceForm.imageDisplays': imageDisplays,
    })
  },

  chooseWechatQrImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (!file) return
        this.setData({
          'serviceForm.wechatQrImage': file,
          'serviceForm.wechatQrImageDisplay': file,
        })
      },
    })
  },

  clearWechatQrImage() {
    this.setData({
      'serviceForm.wechatQrImage': '',
      'serviceForm.wechatQrImageDisplay': '',
    })
  },

  async saveService() {
    const db = wx.cloud.database()
    const form = this.data.serviceForm || {}
    const studioName = String(form.studioName || '').trim()
    const machineModel = String(form.machineModel || '').trim()
    const machineCount = String(form.machineCount || '').trim()
    const description = String(form.description || '').trim()
    const inputImages = (form.images || []).filter(Boolean).slice(0, 3)
    let wechatQrImage = String(form.wechatQrImage || '').trim()

    if (!studioName || !machineModel || !machineCount || !description || !inputImages.length) {
      wx.showToast({ title: '请完整填写服务信息', icon: 'none' })
      return
    }

    this.setOperationState('save-service', form.id || 'new')
    wx.showLoading({ title: '正在保存' })
    try {
      const uploadedImages = []
      for (let index = 0; index < inputImages.length; index += 1) {
        const image = String(inputImages[index] || '').trim()
        if (!image) continue
        if (isUploadedAsset(image)) {
          uploadedImages.push(image)
          continue
        }
        const ext = (image.split('.').pop() || 'jpg').toLowerCase()
        const cloudPath = `studio-services/${form.id || Date.now()}-${Date.now()}-${index}.${ext}`
        const upload = await wx.cloud.uploadFile({
          cloudPath,
          filePath: image,
        })
        if (upload.fileID) {
          uploadedImages.push(upload.fileID)
        }
      }
      if (wechatQrImage && !isUploadedAsset(wechatQrImage)) {
        const ext = (wechatQrImage.split('.').pop() || 'jpg').toLowerCase()
        const cloudPath = `studio-services-qr/${form.id || Date.now()}-${Date.now()}.${ext}`
        const upload = await wx.cloud.uploadFile({
          cloudPath,
          filePath: wechatQrImage,
        })
        wechatQrImage = upload.fileID || ''
      }
      const payload = {
        studioName,
        machineModel,
        machineCount,
        contact: '',
        description,
        images: uploadedImages,
        environmentImage: uploadedImages[0] || '',
        wechatQrImage,
        updated_at: db.serverDate(),
      }
      if (form.id) {
        await db.collection('studio_services').doc(form.id).update({ data: payload })
      } else {
        await db.collection('studio_services').add({
          data: {
            ...payload,
            created_at: db.serverDate(),
          },
        })
      }
      wx.showToast({ title: form.id ? '已更新' : '已添加', icon: 'success' })
      this.resetServiceForm()
      await this.loadServices()
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查 studio_services 集合和权限',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
      wx.hideLoading()
    }
  },

  deleteService(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.services.find((row) => row.id === id)
    if (!item) return
    wx.showModal({
      title: '删除打印服务',
      content: `确定删除「${item.studioName}」吗？`,
      success: async (res) => {
        if (!res.confirm) return
        this.setOperationState('delete-service', item.id)
        try {
          await wx.cloud.database().collection('studio_services').doc(item.id).remove()
          wx.showToast({ title: '已删除', icon: 'success' })
          if (this.data.serviceForm.id === item.id) {
            this.resetServiceForm()
          }
          await this.loadServices()
        } catch (error) {
          wx.showModal({
            title: '删除失败',
            content: error?.message || '请检查数据库权限',
            showCancel: false,
          })
        } finally {
          this.clearOperationState()
        }
      },
    })
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
      if (item.submissionType !== 'knowledge') {
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
      }
      wx.showToast({ title: '已通过', icon: 'success' })
      clearProblemCaches()
      await this.loadSubmissions()
      await this.loadProblems({ reset: true })
      if (this.data.section === 'submissions') {
        this.setData({
          submissions: this.data.submissions.map((row) => row.id === item.id ? { ...row, status: 'published', statusText: '已通过' } : row),
        })
      }
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
    const item = this.data.submissions.find((row) => row.id === id)
    this.setOperationState('view', id)
    wx.showLoading({ title: '正在打开' })
    wx.navigateTo({
      url: item?.submissionType === 'knowledge'
        ? `/pages/knowledge-submit/index?id=${id}`
        : `/pages/problem-detail/index?id=${id}`,
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
