const imageCache = {}

function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

function normalizeAsset(value = '') {
  if (!value) return ''
  if (typeof value === 'object') {
    return String(value.fileID || value.fileId || value.url || value.src || value.path || '').trim()
  }
  return String(value || '').trim()
}

function normalizeTextItems(list = []) {
  if (!Array.isArray(list) || !list.length) return [{ text: '' }]
  return list.map((item) => ({
    text: typeof item === 'string' ? item : String(item?.text || item?.detail || item?.title || ''),
  }))
}

function normalizeSolutions(list = []) {
  if (!Array.isArray(list) || !list.length) return [{ title: '步骤 1', detail: '', image_url: '', displayUrl: '' }]
  return list.map((item, index) => ({
    step: Number(item.step || index + 1),
    title: String(item.title || `步骤 ${index + 1}`),
    detail: String(item.detail || item.text || ''),
    image_url: normalizeAsset(item.image_url || item.image || ''),
    displayUrl: '',
  }))
}

function sanitizePathSegment(value = '') {
  return String(value || 'problem').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'problem'
}

Page({
  data: {
    loading: false,
    saving: false,
    deleting: false,
    imageInputsVisible: false,
    docId: '',
    problemId: '',
    title: '',
    subtitle: '',
    category: '',
    difficulty: '',
    description: '',
    imageUrl: '',
    imageDisplayUrl: '',
    causes: [{ text: '' }],
    solutions: [{ title: '步骤 1', detail: '', image_url: '', displayUrl: '' }],
    tips: '',
  },

  onLoad(options = {}) {
    this.setData({
      docId: decodeURIComponent(options.docId || ''),
      problemId: decodeURIComponent(options.problemId || ''),
    })
    this.guardAdmin()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.loadProblem()
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async resolveAssetUrl(value = '') {
    const raw = normalizeAsset(value)
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    if (imageCache[raw]) return imageCache[raw]
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'resolveFileUrls',
          fileList: [raw],
        },
      })
      const result = res?.result || {}
      const url = result.urlMap?.[raw] || result.fileList?.[0]?.tempFileURL || result.fileList?.[0]?.tempFileUrl || ''
      if (url) {
        imageCache[raw] = url
        return url
      }
    } catch (error) {
      console.warn('resolve problem asset failed', raw, error)
    }
    return ''
  },

  async resolveSolutions(solutions = []) {
    const rows = []
    for (const item of solutions) {
      rows.push({
        ...item,
        displayUrl: await this.resolveAssetUrl(item.image_url),
      })
    }
    return rows.length ? rows : [{ title: '步骤 1', detail: '', image_url: '', displayUrl: '' }]
  },

  async loadProblem() {
    if (!this.data.docId && !this.data.problemId) {
      wx.showToast({ title: '缺少问题 ID', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminGetProblem',
          problemDocId: this.data.docId,
          problemId: this.data.problemId,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '加载失败')
      const item = result.problem || {}
      const imageUrl = normalizeAsset(item.image_url)
      const solutions = normalizeSolutions(item.solutions || [])
      this.setData({
        docId: item.docId || this.data.docId,
        problemId: item.problemId || this.data.problemId,
        title: item.title || '',
        subtitle: item.subtitle || '',
        category: item.category || '',
        difficulty: item.difficulty || '',
        description: item.description || '',
        imageUrl,
        imageDisplayUrl: await this.resolveAssetUrl(imageUrl),
        causes: normalizeTextItems(item.causes || []),
        solutions: await this.resolveSolutions(solutions),
        tips: item.tips || '',
      })
      wx.setNavigationBarTitle({ title: item.title ? '编辑问题' : '问题详情' })
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查云函数和 problems 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: event.detail.value })
    if (field === 'imageUrl') {
      this.resolveAssetUrl(event.detail.value).then((displayUrl) => {
        this.setData({ imageDisplayUrl: displayUrl })
      })
    }
  },

  onCauseInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    const causes = this.data.causes.slice()
    causes[index] = { text: event.detail.value }
    this.setData({ causes })
  },

  addCause() {
    this.setData({ causes: this.data.causes.concat({ text: '' }) })
  },

  removeCause(event) {
    const causes = this.data.causes.slice()
    if (causes.length <= 1) return
    causes.splice(Number(event.currentTarget.dataset.index), 1)
    this.setData({ causes })
  },

  onSolutionInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    const field = event.currentTarget.dataset.field
    const solutions = this.data.solutions.slice()
    solutions[index] = { ...(solutions[index] || {}), [field]: event.detail.value }
    this.setData({ solutions })
    if (field === 'image_url') {
      this.resolveAssetUrl(event.detail.value).then((displayUrl) => {
        const next = this.data.solutions.slice()
        next[index] = { ...(next[index] || {}), displayUrl }
        this.setData({ solutions: next })
      })
    }
  },

  addSolution() {
    const nextIndex = this.data.solutions.length + 1
    this.setData({
      solutions: this.data.solutions.concat({
        step: nextIndex,
        title: `步骤 ${nextIndex}`,
        detail: '',
        image_url: '',
        displayUrl: '',
      }),
    })
  },

  removeSolution(event) {
    const solutions = this.data.solutions.slice()
    if (solutions.length <= 1) return
    solutions.splice(Number(event.currentTarget.dataset.index), 1)
    this.setData({
      solutions: solutions.map((item, index) => ({
        ...item,
        step: index + 1,
        title: item.title || `步骤 ${index + 1}`,
      })),
    })
  },

  toggleImageInputs() {
    this.setData({ imageInputsVisible: !this.data.imageInputsVisible })
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.url || ''
    if (!current) return
    const urls = [this.data.imageDisplayUrl]
      .concat((this.data.solutions || []).map((item) => item.displayUrl))
      .filter(Boolean)
    wx.previewImage({
      current,
      urls: urls.length ? urls : [current],
    })
  },

  chooseCoverImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (file) await this.uploadImage(file, 'cover')
      },
    })
  },

  chooseSolutionImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (file) await this.uploadImage(file, 'solution', index)
      },
    })
  },

  async uploadImage(file = '', type = 'cover', index = 0) {
    const problemKey = sanitizePathSegment(this.data.problemId || this.data.docId)
    const ext = (file.split('.').pop() || 'jpg').toLowerCase()
    const folder = type === 'solution' ? 'problem-step-images' : 'problem-covers'
    const cloudPath = `${folder}/${problemKey}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    wx.showLoading({ title: '上传中', mask: true })
    try {
      await getApp().ensureCloud()
      const upload = await getApp().getCloud().uploadFile({
        cloudPath,
        filePath: file,
      })
      const fileID = upload.fileID || ''
      if (!fileID) throw new Error('未获取到云文件 ID')
      const displayUrl = await this.resolveAssetUrl(fileID)
      if (type === 'solution') {
        const solutions = this.data.solutions.slice()
        solutions[index] = { ...(solutions[index] || {}), image_url: fileID, displayUrl }
        this.setData({ solutions })
      } else {
        this.setData({ imageUrl: fileID, imageDisplayUrl: displayUrl })
      }
      wx.showToast({ title: '已上传', icon: 'success' })
    } catch (error) {
      wx.showModal({
        title: '上传失败',
        content: error?.message || '请检查云存储权限',
        showCancel: false,
      })
    } finally {
      wx.hideLoading()
    }
  },

  buildPayload() {
    const title = String(this.data.title || '').trim()
    const description = String(this.data.description || '').trim()
    const causes = this.data.causes.map((item) => String(item.text || '').trim()).filter(Boolean)
    const solutions = this.data.solutions.map((item, index) => ({
      step: index + 1,
      title: String(item.title || `步骤 ${index + 1}`).trim(),
      detail: String(item.detail || '').trim(),
      image_url: String(item.image_url || '').trim(),
    })).filter((item) => item.detail || item.image_url)
    return {
      docId: this.data.docId,
      problemId: this.data.problemId,
      title,
      subtitle: String(this.data.subtitle || description.slice(0, 80)).trim(),
      category: String(this.data.category || '未分类').trim(),
      difficulty: String(this.data.difficulty || '').trim(),
      description,
      image_url: String(this.data.imageUrl || '').trim(),
      causes,
      solutions,
      tips: String(this.data.tips || '').trim(),
    }
  },

  validatePayload(payload = {}) {
    if (!payload.title) return '请填写问题标题'
    if (!payload.description) return '请填写问题描述'
    if (!payload.solutions?.length) return '至少填写一个解决步骤'
    return ''
  },

  async save() {
    if (this.data.saving) return
    const payload = this.buildPayload()
    const error = this.validatePayload(payload)
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminUpdateProblem',
          problemDocId: this.data.docId,
          problem: payload,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '保存失败')
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查云函数和 problems 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ saving: false })
      wx.hideLoading()
    }
  },

  deleteProblem() {
    if (!this.data.docId && !this.data.problemId) return
    wx.showModal({
      title: '删除问题',
      content: '确定删除这个问题吗？删除后问题库将不再显示。',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: async (res) => {
        if (!res.confirm) return
        await this.confirmDeleteProblem()
      },
    })
  },

  async confirmDeleteProblem() {
    this.setData({ deleting: true })
    wx.showLoading({ title: '删除中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminDeleteProblem',
          problemDocId: this.data.docId,
          problemId: this.data.problemId,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '删除失败')
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.showModal({
        title: '删除失败',
        content: error?.message || '请检查云函数和 problems 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ deleting: false })
      wx.hideLoading()
    }
  },
})
