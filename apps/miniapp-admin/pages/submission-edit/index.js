function isAdminUser(user = {}) {
  const role = String(user.role || '').trim().toLowerCase()
  return user.isAdmin === true || user.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

function normalizeTextList(list = []) {
  return Array.isArray(list) && list.length
    ? list.map((item) => ({ text: typeof item === 'string' ? item : String(item?.text || item?.detail || item?.title || '') }))
    : [{ text: '' }]
}

function normalizeSteps(item = {}) {
  const source = Array.isArray(item.steps) && item.steps.length ? item.steps : item.solutions || []
  return source.length
    ? source.map((step, index) => ({
        text: String(step.text || step.detail || step.title || '').trim(),
        image: String(step.image_url || step.image || '').trim(),
        step: step.step || index + 1,
      }))
    : [{ text: '', image: '', step: 1 }]
}

function normalizeBlocks(item = {}) {
  const blocks = Array.isArray(item.detail_blocks) ? item.detail_blocks : []
  if (blocks.length) {
    return blocks.map((block) => ({
      text: String(block.text || '').trim(),
      images: Array.isArray(block.images) && block.images.length ? block.images.map((image) => ({ value: String(image || '').trim() })) : [{ value: '' }],
    }))
  }
  return [{ text: String(item.description || '').trim(), images: [{ value: '' }] }]
}

function normalizeImages(list = []) {
  return Array.isArray(list) && list.length ? list.map((value) => ({ value: String(value || '').trim() })) : [{ value: '' }]
}

function isCloudAsset(value = '') {
  return String(value || '').trim().startsWith('cloud://')
}

function getCloudFileId(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('cloud://')) return raw
  const match = raw.match(/cloud:\/\/[^"'\s]+/)
  return match?.[0] || ''
}

const resolvedAssetCache = {}

Page({
  data: {
    id: '',
    loading: false,
    saving: false,
    submissionType: 'problem',
    statusText: '',
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    imageDisplayUrl: '',
    causes: [{ text: '' }],
    steps: [{ text: '', image: '', step: 1 }],
    detailBlocks: [{ text: '', images: [{ value: '' }] }],
    effectImages: [{ value: '' }],
    studioName: '',
    machineModel: '',
    machineCount: '',
    contact: '',
    serviceImages: [{ value: '' }],
    wechatQrImage: '',
    imageInputsVisible: false,
  },

  onLoad(options = {}) {
    this.data.id = options.id || ''
    this.guardAdmin()
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.loadSubmission()
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  async loadSubmission() {
    if (!this.data.id) {
      wx.showToast({ title: '缺少投稿 ID', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })
    try {
      const db = getApp().getCloud().database()
      const { data } = await db.collection('user_problems').where({ _id: this.data.id }).limit(1).get()
      const item = data?.[0]
      if (!item) {
        wx.showToast({ title: '投稿不存在', icon: 'none' })
        return
      }
      const submissionType = item.submission_type || 'problem'
      const service = item.service || {}
      const effectImages = normalizeImages(item.effect_images || [])
      const serviceImages = normalizeImages(service.images || item.images || [])
      this.setData({
        id: item._id,
        submissionType,
        statusText: item.status === 'published' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '待审核',
        title: item.title || service.studioName || '',
        subtitle: item.subtitle || '',
        description: item.description || service.description || '',
        imageUrl: item.image_url || '',
        imageDisplayUrl: await this.resolveAssetUrl(item.image_url || ''),
        causes: normalizeTextList(item.causes || []),
        steps: await this.resolveSteps(normalizeSteps(item)),
        detailBlocks: await this.resolveBlocks(normalizeBlocks(item)),
        effectImages: await this.resolveImageList(effectImages),
        studioName: service.studioName || item.studioName || item.title || '',
        machineModel: service.machineModel || item.machineModel || '',
        machineCount: service.machineCount || item.machineCount || '',
        contact: service.contact || item.contact || '',
        serviceImages: await this.resolveImageList(serviceImages),
        wechatQrImage: service.wechatQrImage || item.wechatQrImage || '',
        wechatQrImageDisplayUrl: await this.resolveAssetUrl(service.wechatQrImage || item.wechatQrImage || ''),
      })
      wx.setNavigationBarTitle({
        title: submissionType === 'knowledge' ? '知识投稿详情' : submissionType === 'service' ? '服务投稿详情' : '问题投稿详情',
      })
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查 user_problems 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  async resolveAssetUrl(value = '') {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (!isCloudAsset(raw)) return raw
    const fileID = getCloudFileId(raw)
    if (!fileID) return raw
    if (resolvedAssetCache[fileID]) return resolvedAssetCache[fileID]
    try {
      const cloud = getApp().getCloud()
      const res = await cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'resolveFileUrls',
          fileList: [fileID],
        },
      })
      const result = res?.result || {}
      if (result.ok === false) {
        throw new Error(result.error || '图片解析失败')
      }
      const url = result.urlMap?.[fileID] || result.fileList?.[0]?.tempFileURL || result.fileList?.[0]?.tempFileUrl || ''
      if (url) {
        resolvedAssetCache[fileID] = url
        return url
      }
    } catch (error) {
      console.warn('resolve admin cloud asset by function failed', fileID, error)
    }
    return ''
  },

  async resolveImageList(list = []) {
    const resolved = []
    for (const item of list) {
      const value = String(item?.value || '').trim()
      resolved.push({
        value,
        displayUrl: await this.resolveAssetUrl(value),
      })
    }
    return resolved.length ? resolved : [{ value: '', displayUrl: '' }]
  },

  async resolveSteps(steps = []) {
    const resolved = []
    for (const step of steps) {
      const image = String(step.image || '').trim()
      resolved.push({
        ...step,
        image,
        displayUrl: await this.resolveAssetUrl(image),
      })
    }
    return resolved.length ? resolved : [{ text: '', image: '', displayUrl: '', step: 1 }]
  },

  async resolveBlocks(blocks = []) {
    const resolved = []
    for (const block of blocks) {
      resolved.push({
        ...block,
        images: await this.resolveImageList(block.images || []),
      })
    }
    return resolved.length ? resolved : [{ text: '', images: [{ value: '', displayUrl: '' }] }]
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
    if (field === 'wechatQrImage') {
      this.resolveAssetUrl(event.detail.value).then((displayUrl) => {
        this.setData({ wechatQrImageDisplayUrl: displayUrl })
      })
    }
  },

  toggleImageInputs() {
    this.setData({ imageInputsVisible: !this.data.imageInputsVisible })
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.url || ''
    const urls = this.collectPreviewUrls()
    if (!current) return
    wx.previewImage({
      current,
      urls: urls.length ? urls : [current],
    })
  },

  collectPreviewUrls() {
    const urls = []
    const push = (value = '') => {
      const url = String(value || '').trim()
      if (url && !urls.includes(url)) urls.push(url)
    }
    push(this.data.imageDisplayUrl)
    push(this.data.wechatQrImageDisplayUrl)
    for (const step of this.data.steps || []) push(step.displayUrl)
    for (const block of this.data.detailBlocks || []) {
      for (const image of block.images || []) push(image.displayUrl)
    }
    for (const image of this.data.effectImages || []) push(image.displayUrl)
    for (const image of this.data.serviceImages || []) push(image.displayUrl)
    return urls
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

  onStepInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    const field = event.currentTarget.dataset.field
    const steps = this.data.steps.slice()
    steps[index] = { ...(steps[index] || { text: '', image: '', step: index + 1 }), [field]: event.detail.value }
    this.setData({ steps })
    if (field === 'image') {
      this.resolveAssetUrl(event.detail.value).then((displayUrl) => {
        const nextSteps = this.data.steps.slice()
        nextSteps[index] = { ...(nextSteps[index] || {}), displayUrl }
        this.setData({ steps: nextSteps })
      })
    }
  },

  addStep() {
    this.setData({ steps: this.data.steps.concat({ text: '', image: '', step: this.data.steps.length + 1 }) })
  },

  removeStep(event) {
    const steps = this.data.steps.slice()
    if (steps.length <= 1) return
    steps.splice(Number(event.currentTarget.dataset.index), 1)
    this.setData({ steps })
  },

  onBlockTextInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    const detailBlocks = this.data.detailBlocks.slice()
    detailBlocks[index] = { ...(detailBlocks[index] || { text: '', images: [{ value: '' }] }), text: event.detail.value }
    this.setData({ detailBlocks })
  },

  addBlock() {
    this.setData({ detailBlocks: this.data.detailBlocks.concat({ text: '', images: [{ value: '' }] }) })
  },

  removeBlock(event) {
    const detailBlocks = this.data.detailBlocks.slice()
    if (detailBlocks.length <= 1) return
    detailBlocks.splice(Number(event.currentTarget.dataset.index), 1)
    this.setData({ detailBlocks })
  },

  onBlockImageInput(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex)
    const imageIndex = Number(event.currentTarget.dataset.imageIndex)
    const detailBlocks = this.data.detailBlocks.slice()
    const block = detailBlocks[blockIndex] || { text: '', images: [{ value: '' }] }
    const images = (block.images || [{ value: '' }]).slice()
    images[imageIndex] = { ...(images[imageIndex] || {}), value: event.detail.value }
    detailBlocks[blockIndex] = { ...block, images }
    this.setData({ detailBlocks })
    this.resolveAssetUrl(event.detail.value).then((displayUrl) => {
      const nextBlocks = this.data.detailBlocks.slice()
      const nextBlock = nextBlocks[blockIndex] || { text: '', images: [] }
      const nextImages = (nextBlock.images || []).slice()
      nextImages[imageIndex] = { ...(nextImages[imageIndex] || {}), displayUrl }
      nextBlocks[blockIndex] = { ...nextBlock, images: nextImages }
      this.setData({ detailBlocks: nextBlocks })
    })
  },

  addBlockImage(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex)
    const detailBlocks = this.data.detailBlocks.slice()
    const block = detailBlocks[blockIndex] || { text: '', images: [] }
    detailBlocks[blockIndex] = { ...block, images: (block.images || []).concat({ value: '', displayUrl: '' }) }
    this.setData({ detailBlocks })
  },

  removeBlockImage(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex)
    const imageIndex = Number(event.currentTarget.dataset.imageIndex)
    const detailBlocks = this.data.detailBlocks.slice()
    const block = detailBlocks[blockIndex] || { text: '', images: [{ value: '' }] }
    const images = (block.images || []).slice()
    if (images.length <= 1) return
    images.splice(imageIndex, 1)
    detailBlocks[blockIndex] = { ...block, images }
    this.setData({ detailBlocks })
  },

  onListImageInput(event) {
    const listName = event.currentTarget.dataset.list
    const index = Number(event.currentTarget.dataset.index)
    const list = (this.data[listName] || []).slice()
    list[index] = { ...(list[index] || {}), value: event.detail.value }
    this.setData({ [listName]: list })
    this.resolveAssetUrl(event.detail.value).then((displayUrl) => {
      const nextList = (this.data[listName] || []).slice()
      nextList[index] = { ...(nextList[index] || {}), displayUrl }
      this.setData({ [listName]: nextList })
    })
  },

  addListImage(event) {
    const listName = event.currentTarget.dataset.list
    this.setData({ [listName]: (this.data[listName] || []).concat({ value: '', displayUrl: '' }) })
  },

  removeListImage(event) {
    const listName = event.currentTarget.dataset.list
    const list = (this.data[listName] || []).slice()
    if (list.length <= 1) return
    list.splice(Number(event.currentTarget.dataset.index), 1)
    this.setData({ [listName]: list })
  },

  buildProblemPayload() {
    const title = String(this.data.title || '').trim()
    const description = String(this.data.description || '').trim()
    const causes = this.data.causes.map((item) => String(item.text || '').trim()).filter(Boolean)
    const steps = this.data.steps
      .map((item, index) => ({
        step: index + 1,
        text: String(item.text || '').trim(),
        image_url: String(item.image || '').trim(),
      }))
      .filter((item) => item.text || item.image_url)
    const solutions = steps.map((step) => ({
      step: step.step,
      title: `步骤 ${step.step}`,
      detail: step.text,
      image_url: step.image_url,
    }))
    return {
      title,
      subtitle: description.slice(0, 80),
      description,
      image_url: String(this.data.imageUrl || '').trim(),
      causes,
      steps,
      solutions,
      tips: '',
      submission_type: 'problem',
    }
  },

  buildKnowledgePayload() {
    const title = String(this.data.title || '').trim()
    const detailBlocks = this.data.detailBlocks
      .map((block) => ({
        text: String(block.text || '').trim(),
        images: (block.images || []).map((image) => String(image.value || '').trim()).filter(Boolean),
      }))
      .filter((block) => block.text || block.images.length)
    const effectImages = this.data.effectImages.map((image) => String(image.value || '').trim()).filter(Boolean)
    const description = detailBlocks.map((block) => block.text).filter(Boolean).join('\n')
    return {
      title,
      subtitle: description.slice(0, 80),
      description,
      image_url: effectImages[0] || '',
      detail_blocks: detailBlocks,
      effect_images: effectImages,
      causes: [],
      steps: [],
      solutions: [],
      tips: '',
      category: '知识心得',
      submission_type: 'knowledge',
    }
  },

  buildServicePayload() {
    const studioName = String(this.data.studioName || '').trim()
    const machineModel = String(this.data.machineModel || '').trim()
    const machineCount = String(this.data.machineCount || '').trim()
    const description = String(this.data.description || '').trim()
    const contact = String(this.data.contact || '').trim()
    const images = this.data.serviceImages.map((image) => String(image.value || '').trim()).filter(Boolean).slice(0, 3)
    const wechatQrImage = String(this.data.wechatQrImage || '').trim()
    const service = {
      studioName,
      machineModel,
      machineCount,
      contact,
      description,
      images,
      environmentImage: images[0] || '',
      wechatQrImage,
    }
    return {
      title: studioName,
      subtitle: `${machineModel} · ${machineCount}`,
      description,
      image_url: images[0] || '',
      service,
      studioName,
      machineModel,
      machineCount,
      contact,
      images,
      environmentImage: images[0] || '',
      wechatQrImage,
      category: '打印服务',
      submission_type: 'service',
    }
  },

  validatePayload(payload = {}) {
    if (!payload.title) return '请填写标题'
    if (this.data.submissionType === 'problem') {
      if (!payload.description) return '请填写问题描述'
      if (!payload.steps?.some((item) => item.text)) return '至少填写一个解决步骤'
    }
    if (this.data.submissionType === 'knowledge' && !payload.detail_blocks?.length) return '请填写详细描述'
    if (this.data.submissionType === 'service') {
      if (!payload.machineModel || !payload.machineCount || !payload.description) return '请完整填写服务信息'
      if (!payload.contact && !payload.wechatQrImage) return '请填写微信号或联系方式二维码'
    }
    return ''
  },

  async save() {
    if (this.data.saving) return
    const payload = this.data.submissionType === 'knowledge'
      ? this.buildKnowledgePayload()
      : this.data.submissionType === 'service'
        ? this.buildServicePayload()
        : this.buildProblemPayload()
    const error = this.validatePayload(payload)
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中', mask: true })
    try {
      const db = getApp().getCloud().database()
      await db.collection('user_problems').doc(this.data.id).update({
        data: {
          ...payload,
          updated_at: db.serverDate(),
        },
      })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (saveError) {
      wx.showModal({
        title: '保存失败',
        content: saveError?.message || '请检查数据库权限',
        showCancel: false,
      })
    } finally {
      this.setData({ saving: false })
      wx.hideLoading()
    }
  },
})
