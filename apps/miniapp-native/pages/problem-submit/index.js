const { requireLoginForAction } = require('../../utils/user-service')
const { getProblemDetail, clearProblemCache, clearProblemCaches } = require('../../utils/problem-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

Page({
  data: {
    submissionId: '',
    problemId: '',
    title: '',
    description: '',
    coverImage: '',
    coverImageValue: '',
    coverImageChanged: false,
    causes: [{ text: '' }],
    steps: [{ text: '', image: '', displayImage: '' }],
    submitting: false,
    pageTitle: '分享打印问题',
  },

  async resolveDisplayImage(value = '') {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      return res?.fileList?.[0]?.tempFileURL || raw
    } catch (error) {
      console.warn('resolve display image failed', error)
      return raw
    }
  },

  async onLoad(query) {
    wx.hideLoading()
    const user = await requireLoginForAction('请先登录后分享问题')
    if (!user?.id) return

    const problemId = query?.problemId || ''
    if (problemId) {
      await this.loadProblemForEdit(problemId)
      return
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
      const coverImageValue = item.image_url || ''
      const coverImage = await this.resolveDisplayImage(coverImageValue)
      const normalizedSteps = (item.steps && item.steps.length)
        ? await Promise.all(item.steps.map(async (step) => {
            const image = step.image_url || step.image || ''
            return {
              text: step.text || step.detail || step.title || '',
              image,
              displayImage: await this.resolveDisplayImage(image),
            }
          }))
        : (item.solutions && item.solutions.length)
          ? await Promise.all(item.solutions.map(async (step) => {
              const image = step.image_url || step.image || ''
              return {
                text: step.detail || step.title || '',
                image,
                displayImage: await this.resolveDisplayImage(image),
              }
            }))
          : [{ text: '', image: '', displayImage: '' }]
      this.setData({
        submissionId,
        title: item.title || '',
        description: item.description || '',
        coverImage,
        coverImageValue,
        causes: (item.causes && item.causes.length)
          ? item.causes.map((text) => ({ text: String(text || '') }))
          : [{ text: '' }],
        steps: normalizedSteps,
        pageTitle: '修改投稿',
      })
      wx.setNavigationBarTitle({ title: '修改投稿' })
    } catch (error) {
      console.warn('load submission for edit failed', error)
    } finally {
      hideAppLoading()
    }
  },

  async loadProblemForEdit(problemId) {
    showAppLoading('加载中')
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('problems').where({ problem_id: problemId }).limit(1).get()
      let rawItem = data?.[0] || null
      if (!rawItem) {
        try {
          const res = await db.collection('problems').doc(problemId).get()
          rawItem = res?.data || null
        } catch (error) {
          console.warn('load raw problem by doc id failed', error)
        }
      }
      const detailItem = await getProblemDetail(problemId)
      const item = rawItem || detailItem
      if (!item) {
        wx.showToast({ title: '问题不存在', icon: 'none' })
        return
      }
      const coverImageValue = item.image_url || item.cover_image || ''
      const fallbackDisplayImage = detailItem?.image_url || detailItem?.thumb_url || ''
      const coverImage = coverImageValue
        ? await this.resolveDisplayImage(coverImageValue)
        : fallbackDisplayImage
      const solutions = Array.isArray(item.solutions) ? item.solutions : []
      const normalizedSteps = solutions.length
        ? await Promise.all(solutions.map(async (step) => {
            const image = step.image_url || step.image || ''
            return {
              text: step.detail || step.text || step.title || '',
              image,
              displayImage: await this.resolveDisplayImage(image),
            }
          }))
        : [{ text: '', image: '', displayImage: '' }]
      this.setData({
        problemId,
        title: item.title || '',
        description: item.description || '',
        coverImage,
        coverImageValue,
        coverImageChanged: false,
        causes: (item.causes && item.causes.length)
          ? item.causes.map((text) => ({ text: String(text || '') }))
          : [{ text: '' }],
        steps: normalizedSteps,
        pageTitle: '修改问题',
      })
      wx.setNavigationBarTitle({ title: '修改问题' })
    } catch (error) {
      console.warn('load problem for edit failed', error)
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请稍后重试',
        showCancel: false,
      })
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
      steps: [...this.data.steps, { text: '', image: '', displayImage: '' }],
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
    steps[index] = {
      ...(steps[index] || { text: '', image: '' }),
      text: e.detail.value,
    }
    this.setData({ steps })
  },

  chooseStepImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const steps = this.data.steps.slice()
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (!file?.tempFilePath) return
        steps[index] = {
          ...(steps[index] || { text: '', image: '', displayImage: '' }),
          image: file.tempFilePath,
          displayImage: file.tempFilePath,
        }
        this.setData({ steps })
      },
    })
  },

  removeStepImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const steps = this.data.steps.slice()
    steps[index] = {
      ...(steps[index] || { text: '', image: '' }),
      image: '',
      displayImage: '',
    }
    this.setData({ steps })
  },

  async uploadImage(filePath, folder) {
    const raw = String(filePath || '').trim()
    if (!raw) return ''
    if (raw.startsWith('cloud://') || raw.startsWith('http')) return raw
    const ext = (raw.split('.').pop() || 'jpg').toLowerCase()
    const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const upload = await wx.cloud.uploadFile({
      cloudPath,
      filePath: raw,
    })
    return upload.fileID || ''
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (file?.tempFilePath) {
          this.setData({
            coverImage: file.tempFilePath,
            coverImageValue: file.tempFilePath,
            coverImageChanged: true,
          })
        }
      },
    })
  },

  async submit() {
    if (this.data.submitting) return
    const user = await requireLoginForAction(this.data.problemId || this.data.submissionId ? '请先登录后保存' : '请先登录后分享问题')
    if (!user?.id) return

    const title = String(this.data.title || '').trim()
    const description = String(this.data.description || '').trim()
    const causes = (this.data.causes || [])
      .map((item) => String(item.text || '').trim())
      .filter(Boolean)
    const steps = (this.data.steps || [])
      .map((item) => ({
        text: String(item.text || '').trim(),
        image: String(item.image || '').trim(),
      }))
      .filter((item) => item.text || item.image)

    if (!title) {
      wx.showToast({ title: '请填写问题标题', icon: 'none' })
      return
    }
    if (!description) {
      wx.showToast({ title: '请填写问题描述', icon: 'none' })
      return
    }
    if (!steps.some((item) => item.text)) {
      wx.showToast({ title: '至少填写一个解决步骤', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    showAppLoading(this.data.submissionId || this.data.problemId ? '保存中' : '提交中')
    try {
      const db = wx.cloud.database()
      let imageUrl = this.data.coverImageValue || this.data.coverImage || ''
      if (imageUrl) {
        const isRemoteImage = String(imageUrl).startsWith('http') || String(imageUrl).startsWith('cloud://')
        if (!isRemoteImage) {
          imageUrl = await this.uploadImage(imageUrl, 'problem-submits')
        }
      }

      const uploadedSteps = []
      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index]
        uploadedSteps.push({
          step: index + 1,
          text: step.text,
          image_url: step.image ? await this.uploadImage(step.image, 'problem-step-images') : '',
        })
      }

      const solutions = uploadedSteps.map((step) => ({
        step: step.step,
        title: `步骤 ${step.step}`,
        detail: step.text,
        image_url: step.image_url,
      }))
      const payload = {
        user_id: user.id,
        title,
        subtitle: description.slice(0, 80),
        description,
        image_url: imageUrl,
        causes,
        steps: uploadedSteps,
        solutions,
        tips: '',
        submission_type: 'problem',
        status: 'pending',
        updated_at: db.serverDate(),
      }

      if (this.data.problemId) {
        const problemPayload = {
          title,
          subtitle: description.slice(0, 80),
          description,
          causes,
          solutions,
          search_text: [title, description, ...causes, ...solutions.map((item) => item.detail)].filter(Boolean).join(' '),
          updated_at: db.serverDate(),
        }
        if (this.data.coverImageChanged || imageUrl) {
          problemPayload.image_url = imageUrl
        }
        const { data } = await db.collection('problems').where({ problem_id: this.data.problemId }).limit(1).get()
        if (data?.length) {
          await db.collection('problems').doc(data[0]._id).update({ data: problemPayload })
        } else {
          await db.collection('problems').doc(this.data.problemId).update({ data: problemPayload })
        }
        clearProblemCache(this.data.problemId)
        clearProblemCaches()
      } else if (this.data.submissionId) {
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
      wx.showToast({ title: this.data.problemId || this.data.submissionId ? '保存成功' : '提交成功', icon: 'success' })
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
