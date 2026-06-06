const {
  getCurrentUser,
  getCurrentProfile,
  fetchAdminFeedback,
  markFeedbackResolved,
} = require('../../utils/user-service')
const { listProblems, clearProblemCache, clearProblemCaches } = require('../../utils/problem-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

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
    announcements: [],
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
    rewardGoods: [],
    rewardOrders: [],
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
    rewardForm: {
      id: '',
      name: '',
      imageUrl: '',
      imageDisplayUrl: '',
      quantity: '',
      pointsCost: '',
    },
    announcementForm: {
      id: '',
      title: '',
      content: '',
      confirmText: '知道了',
      enabled: true,
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
    showAppLoading('加载中')
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
        this.loadAnnouncements(),
        this.loadUsageStats(),
        this.loadProblems({ reset: true }),
        this.loadServices(),
        this.loadRewardGoods(),
        this.loadRewardOrders(),
      ])
    } finally {
      this.setData({ loading: false })
      hideAppLoading()
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
        userId: item.user_id || '',
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

  async loadAnnouncements() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('app_announcements')
        .orderBy('updated_at', 'desc')
        .limit(50)
        .get()
      const announcements = (data || []).map((item) => ({
        id: item._id,
        title: item.title || '',
        content: item.content || '',
        confirmText: item.confirm_text || '知道了',
        enabled: item.enabled === true,
        statusText: item.enabled === true ? '启用中' : '已停用',
        updatedAt: item.updated_at || item.created_at || null,
      }))
      this.setData({ announcements })
    } catch (error) {
      console.warn('loadAnnouncements failed', error)
      this.setData({ announcements: [] })
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
    if (reset) {
      showAppLoading('加载中')
    }
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
      if (reset) {
        hideAppLoading()
      }
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

  async loadRewardGoods() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('reward_goods')
        .orderBy('updated_at', 'desc')
        .limit(100)
        .get()
      const rewardGoods = await Promise.all((data || []).map(async (item) => ({
        id: item._id,
        name: item.name || '',
        quantity: item.quantity || 0,
        pointsCost: item.points_cost || item.pointsCost || 0,
        imageUrl: normalizeServiceAsset(item.image_url),
        imageDisplayUrl: await this.resolveCloudFile(item.image_url),
        updatedAt: item.updated_at || item.created_at || null,
      })))
      this.setData({ rewardGoods })
    } catch (error) {
      console.warn('loadRewardGoods failed', error)
      this.setData({ rewardGoods: [] })
    }
  },

  async loadRewardOrders() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('reward_orders')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()
      const rewardOrders = await Promise.all((data || []).map(async (item) => ({
        id: item._id,
        userId: item.user_id || '',
        goodsId: item.goods_id || '',
        goodsName: item.goods_name || '',
        goodsImage: normalizeServiceAsset(item.goods_image),
        goodsImageDisplay: await this.resolveCloudFile(item.goods_image),
        pointsCost: Number(item.points_cost || 0),
        status: item.status || 'pending',
        statusText: item.status_text || (item.status === 'done' ? '已处理' : '待处理'),
        address: item.address_snapshot || {},
        addressText: `${item.address_snapshot?.recipient || ''} ${item.address_snapshot?.phone || ''} ${item.address_snapshot?.region_text || ''} ${item.address_snapshot?.detail || ''}`.trim(),
        createdAt: item.created_at || null,
      })))
      this.setData({ rewardOrders })
    } catch (error) {
      console.warn('loadRewardOrders failed', error)
      this.setData({ rewardOrders: [] })
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
    if (section === 'announcements' && !this.data.announcements.length) {
      this.loadAnnouncements()
    }
    if (section === 'analytics' && !this.data.usageStats.length) {
      this.loadUsageStats()
    }
    if (section === 'services' && !this.data.services.length) {
      this.loadServices()
    }
    if (section === 'rewards' && !this.data.rewardGoods.length) {
      this.loadRewardGoods()
    }
    if (section === 'rewardOrders' && !this.data.rewardOrders.length) {
      this.loadRewardOrders()
    }
  },

  onAnnouncementInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({
      [`announcementForm.${field}`]: e.detail.value,
    })
  },

  onAnnouncementEnabledChange(e) {
    this.setData({
      'announcementForm.enabled': !!e.detail.value,
    })
  },

  resetAnnouncementForm() {
    this.setData({
      announcementForm: {
        id: '',
        title: '',
        content: '',
        confirmText: '知道了',
        enabled: true,
      },
    })
  },

  editAnnouncement(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.announcements.find((row) => row.id === id)
    if (!item) return
    this.setData({
      announcementForm: {
        id: item.id,
        title: item.title || '',
        content: item.content || '',
        confirmText: item.confirmText || '知道了',
        enabled: item.enabled === true,
      },
    })
  },

  async saveAnnouncement() {
    const db = wx.cloud.database()
    const form = this.data.announcementForm || {}
    const title = String(form.title || '').trim()
    const content = String(form.content || '').trim()
    const confirmText = String(form.confirmText || '').trim() || '知道了'
    const enabled = form.enabled === true

    if (!title || !content) {
      wx.showToast({ title: '请填写公告标题和内容', icon: 'none' })
      return
    }

    this.setOperationState('save-announcement', form.id || 'new')
    showAppLoading('保存中')
    try {
      const payload = {
        title,
        content,
        confirm_text: confirmText,
        enabled,
        updated_at: db.serverDate(),
      }
      if (form.id) {
        await db.collection('app_announcements').doc(form.id).update({ data: payload })
      } else {
        await db.collection('app_announcements').add({
          data: {
            ...payload,
            created_at: db.serverDate(),
          },
        })
      }
      wx.showToast({ title: form.id ? '已更新公告' : '已发布公告', icon: 'success' })
      this.resetAnnouncementForm()
      await this.loadAnnouncements()
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查 app_announcements 集合和权限',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
      hideAppLoading()
    }
  },

  async toggleAnnouncement(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.announcements.find((row) => row.id === id)
    if (!item) return
    this.setOperationState('toggle-announcement', item.id)
    try {
      await wx.cloud.database().collection('app_announcements').doc(item.id).update({
        data: {
          enabled: !item.enabled,
          updated_at: wx.cloud.database().serverDate(),
        },
      })
      wx.showToast({ title: item.enabled ? '已停用' : '已启用', icon: 'success' })
      await this.loadAnnouncements()
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

  deleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.announcements.find((row) => row.id === id)
    if (!item) return
    wx.showModal({
      title: '删除公告',
      content: `确定删除「${item.title}」吗？`,
      success: async (res) => {
        if (!res.confirm) return
        this.setOperationState('delete-announcement', item.id)
        try {
          await wx.cloud.database().collection('app_announcements').doc(item.id).remove()
          if (this.data.announcementForm.id === item.id) {
            this.resetAnnouncementForm()
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          await this.loadAnnouncements()
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

  onRewardInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({
      [`rewardForm.${field}`]: e.detail.value,
    })
  },

  resetRewardForm() {
    this.setData({
      rewardForm: {
        id: '',
        name: '',
        imageUrl: '',
        imageDisplayUrl: '',
        quantity: '',
        pointsCost: '',
      },
    })
  },

  editRewardGood(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.rewardGoods.find((row) => row.id === id)
    if (!item) return
    this.setData({
      rewardForm: {
        id: item.id,
        name: item.name || '',
        imageUrl: item.imageUrl || '',
        imageDisplayUrl: item.imageDisplayUrl || item.imageUrl || '',
        quantity: String(item.quantity || ''),
        pointsCost: String(item.pointsCost || ''),
      },
    })
  },

  chooseRewardImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (!file) return
        this.setData({
          'rewardForm.imageUrl': file,
          'rewardForm.imageDisplayUrl': file,
        })
      },
    })
  },

  clearRewardImage() {
    this.setData({
      'rewardForm.imageUrl': '',
      'rewardForm.imageDisplayUrl': '',
    })
  },

  async saveRewardGood() {
    const db = wx.cloud.database()
    const form = this.data.rewardForm || {}
    const name = String(form.name || '').trim()
    const quantity = Number(form.quantity || 0)
    const pointsCost = Number(form.pointsCost || 0)
    let imageUrl = String(form.imageUrl || '').trim()

    if (!name || quantity < 0 || pointsCost <= 0) {
      wx.showToast({ title: '请完整填写商品信息', icon: 'none' })
      return
    }

    this.setOperationState('save-reward', form.id || 'new')
    showAppLoading('保存中')
    try {
      if (imageUrl && !isUploadedAsset(imageUrl)) {
        const ext = (imageUrl.split('.').pop() || 'jpg').toLowerCase()
        const cloudPath = `reward-goods/${form.id || Date.now()}-${Date.now()}.${ext}`
        const upload = await wx.cloud.uploadFile({
          cloudPath,
          filePath: imageUrl,
        })
        imageUrl = upload.fileID || ''
      }

      const payload = {
        name,
        image_url: imageUrl,
        quantity: Math.max(0, Math.floor(quantity)),
        points_cost: Math.max(1, Math.floor(pointsCost)),
        updated_at: db.serverDate(),
      }

      if (form.id) {
        await db.collection('reward_goods').doc(form.id).update({ data: payload })
      } else {
        await db.collection('reward_goods').add({
          data: {
            ...payload,
            created_at: db.serverDate(),
          },
        })
      }

      wx.showToast({ title: form.id ? '已更新' : '已上架', icon: 'success' })
      this.resetRewardForm()
      await this.loadRewardGoods()
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查 reward_goods 集合和权限',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
      hideAppLoading()
    }
  },

  deleteRewardGood(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.rewardGoods.find((row) => row.id === id)
    if (!item) return
    wx.showModal({
      title: '删除积分商品',
      content: `确定删除「${item.name}」吗？`,
      success: async (res) => {
        if (!res.confirm) return
        this.setOperationState('delete-reward', item.id)
        try {
          await wx.cloud.database().collection('reward_goods').doc(item.id).remove()
          if (this.data.rewardForm.id === item.id) {
            this.resetRewardForm()
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          await this.loadRewardGoods()
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

  async awardPointsForSubmission(item) {
    if (!item?.id || !item?.userId) return null
    try {
      const res = await wx.cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'awardSubmissionPoints',
          targetUserId: item.userId,
          submissionId: item.id,
          submissionType: item.submissionType || 'problem',
        },
      })
      const result = res?.result || {}
      if (result?.ok === false) {
        throw new Error(result?.error || '积分发放失败')
      }
      return result
    } catch (error) {
      console.warn('award approved submission points failed', error)
      return {
        ok: false,
        error: error?.message || '积分发放失败',
      }
    }
  },

  async markRewardOrderDone(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.rewardOrders.find((row) => row.id === id)
    if (!item?.id) return
    if (item.status === 'done') {
      wx.showToast({ title: '该订单已处理', icon: 'none' })
      return
    }

    this.setOperationState('done-reward-order', item.id)
    showAppLoading('处理中')
    try {
      const db = wx.cloud.database()
      await db.collection('reward_orders').doc(item.id).update({
        data: {
          status: 'done',
          status_text: '已处理',
          updated_at: db.serverDate(),
        },
      })
      wx.showToast({ title: '已标记处理', icon: 'success' })
      await this.loadRewardOrders()
    } catch (error) {
      wx.showModal({
        title: '操作失败',
        content: error?.message || '请检查 reward_orders 集合权限',
        showCancel: false,
      })
    } finally {
      this.clearOperationState()
      hideAppLoading()
    }
  },

  viewRewardOrderAddress(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.rewardOrders.find((row) => row.id === id)
    if (!item) return
    wx.showModal({
      title: item.goodsName || '兑换订单',
      content: `用户：${item.userId}\n商品：${item.goodsName}\n积分：${item.pointsCost}\n状态：${item.statusText}\n\n收货地址：\n${item.addressText || '未填写'}`,
      showCancel: false,
      confirmText: '知道了',
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
    const contact = String(form.contact || '').trim()
    const inputImages = (form.images || []).filter(Boolean).slice(0, 3)
    let wechatQrImage = String(form.wechatQrImage || '').trim()

    if (!studioName || !machineModel || !machineCount || !description) {
      wx.showToast({ title: '请完整填写服务信息', icon: 'none' })
      return
    }

    this.setOperationState('save-service', form.id || 'new')
    showAppLoading('保存中')
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
        contact,
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
      hideAppLoading()
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
    showAppLoading('处理中')
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
      const pointsResult = await this.awardPointsForSubmission(item)
      wx.showToast({
        title: pointsResult?.awarded ? '已通过并加积分' : '已通过',
        icon: 'success',
      })
      if (pointsResult?.dailyLimitReached) {
        wx.showToast({ title: '该用户今日积分已达上限', icon: 'none' })
      }
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
      hideAppLoading()
    }
  },

  async rejectSubmission(e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.submissions.find((row) => row.id === itemId)
    if (!item?.id) return
    const db = wx.cloud.database()
    this.setOperationState('reject', item.id)
    showAppLoading('处理中')
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
      hideAppLoading()
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
    showAppLoading('删除中')
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
      hideAppLoading()
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
    showAppLoading('上传中')
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
      hideAppLoading()
    }
  },

  openProblemDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.setOperationState('view-problem', id)
    showAppLoading('正在打开')
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${id}`,
      fail: () => {
        this.clearOperationState()
        hideAppLoading()
      },
      complete: () => {
        this.clearOperationState()
        hideAppLoading()
      },
    })
  },

  openSubmissionDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const item = this.data.submissions.find((row) => row.id === id)
    this.setOperationState('view', id)
    showAppLoading('正在打开')
    wx.navigateTo({
      url: item?.submissionType === 'knowledge'
        ? `/pages/knowledge-submit/index?id=${id}`
        : `/pages/problem-detail/index?id=${id}`,
      fail: () => {
        this.clearOperationState()
        hideAppLoading()
      },
      complete: () => {
        this.clearOperationState()
        hideAppLoading()
      },
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
