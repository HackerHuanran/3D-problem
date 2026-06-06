const { ensureUser } = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

function normalizeBlockImages(list = []) {
  return (list || []).map((item) => String(item || '').trim()).filter(Boolean)
}

Page({
  data: {
    submissionId: '',
    title: '',
    descriptionBlocks: [{ text: '', images: [] }],
    effectImages: [],
    submitting: false,
    pageTitle: '分享知识心得',
  },

  async onLoad(query) {
    wx.hideLoading()
    try {
      await ensureUser()
    } catch (error) {
      console.warn('knowledge-submit ensureUser failed', error)
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
        descriptionBlocks: (item.detail_blocks && item.detail_blocks.length)
          ? item.detail_blocks.map((block) => ({
              text: block.text || '',
              images: normalizeBlockImages(block.images || []),
            }))
          : [{ text: item.description || '', images: [] }],
        effectImages: normalizeBlockImages(item.effect_images || []),
        pageTitle: '修改知识心得',
      })
      wx.setNavigationBarTitle({ title: '修改知识心得' })
    } catch (error) {
      console.warn('load knowledge submission for edit failed', error)
    } finally {
      hideAppLoading()
    }
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onBlockTextInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const descriptionBlocks = this.data.descriptionBlocks.slice()
    descriptionBlocks[index] = {
      ...(descriptionBlocks[index] || { text: '', images: [] }),
      text: e.detail.value,
    }
    this.setData({ descriptionBlocks })
  },

  addDescriptionBlock() {
    this.setData({
      descriptionBlocks: [...this.data.descriptionBlocks, { text: '', images: [] }],
    })
  },

  removeDescriptionBlock(e) {
    const index = Number(e.currentTarget.dataset.index)
    const descriptionBlocks = this.data.descriptionBlocks.slice()
    if (descriptionBlocks.length <= 1) return
    descriptionBlocks.splice(index, 1)
    this.setData({ descriptionBlocks })
  },

  chooseBlockImages(e) {
    const index = Number(e.currentTarget.dataset.index)
    const blocks = this.data.descriptionBlocks.slice()
    const current = blocks[index]?.images || []
    wx.chooseMedia({
      count: Math.max(1, 6 - current.length),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean)
        if (!files.length) return
        blocks[index] = {
          ...(blocks[index] || { text: '', images: [] }),
          images: current.concat(files).slice(0, 6),
        }
        this.setData({ descriptionBlocks: blocks })
      },
    })
  },

  removeBlockImage(e) {
    const blockIndex = Number(e.currentTarget.dataset.blockIndex)
    const imageIndex = Number(e.currentTarget.dataset.imageIndex)
    const blocks = this.data.descriptionBlocks.slice()
    const images = [...(blocks[blockIndex]?.images || [])]
    images.splice(imageIndex, 1)
    blocks[blockIndex] = {
      ...(blocks[blockIndex] || { text: '', images: [] }),
      images,
    }
    this.setData({ descriptionBlocks: blocks })
  },

  chooseEffectImages() {
    const current = this.data.effectImages || []
    wx.chooseMedia({
      count: Math.max(1, 6 - current.length),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean)
        if (!files.length) return
        this.setData({
          effectImages: current.concat(files).slice(0, 6),
        })
      },
    })
  },

  removeEffectImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const effectImages = this.data.effectImages.slice()
    effectImages.splice(index, 1)
    this.setData({ effectImages })
  },

  async uploadImage(filePath, folder) {
    if (!filePath) return ''
    if (String(filePath).startsWith('cloud://') || String(filePath).startsWith('http')) {
      return filePath
    }
    const ext = (filePath.split('.').pop() || 'jpg').toLowerCase()
    const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const upload = await wx.cloud.uploadFile({
      cloudPath,
      filePath,
    })
    return upload.fileID || ''
  },

  async submit() {
    if (this.data.submitting) return
    const title = String(this.data.title || '').trim()
    const descriptionBlocks = (this.data.descriptionBlocks || [])
      .map((block) => ({
        text: String(block.text || '').trim(),
        images: normalizeBlockImages(block.images || []),
      }))
      .filter((block) => block.text || block.images.length)

    if (!title) {
      wx.showToast({ title: '请填写标题', icon: 'none' })
      return
    }
    if (!descriptionBlocks.length) {
      wx.showToast({ title: '请填写详细描述', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    showAppLoading(this.data.submissionId ? '保存中' : '提交中')
    try {
      const user = await ensureUser()
      const db = wx.cloud.database()

      const uploadedBlocks = []
      for (let index = 0; index < descriptionBlocks.length; index += 1) {
        const block = descriptionBlocks[index]
        const images = []
        for (const image of block.images) {
          const fileID = await this.uploadImage(image, 'knowledge-blocks')
          if (fileID) images.push(fileID)
        }
        uploadedBlocks.push({
          text: block.text,
          images,
        })
      }

      const uploadedEffectImages = []
      for (const image of this.data.effectImages || []) {
        const fileID = await this.uploadImage(image, 'knowledge-effects')
        if (fileID) uploadedEffectImages.push(fileID)
      }

      const description = uploadedBlocks.map((block) => block.text).filter(Boolean).join('\n')
      const payload = {
        user_id: user.id,
        title,
        subtitle: description.slice(0, 80),
        description,
        image_url: uploadedEffectImages[0] || '',
        detail_blocks: uploadedBlocks,
        effect_images: uploadedEffectImages,
        causes: [],
        steps: [],
        solutions: [],
        tips: '',
        category: '知识心得',
        submission_type: 'knowledge',
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
      console.warn('submit knowledge failed', error)
      wx.showModal({
        title: '提交失败',
        content: error?.message || '请检查数据库集合和云存储权限',
        showCancel: false,
      })
    } finally {
      this.setData({ submitting: false })
      hideAppLoading()
    }
  },
})
