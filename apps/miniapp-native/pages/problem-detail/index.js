const { getProblemDetail, getRelatedProblems, resolveProblemThumbUrl } = require('../../utils/problem-service')
const { getCurrentUser, ensureUser, fetchFavorites, toggleFavorite, recordHistory, getSubmissionDetail } = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

Page({
  data: {
    id: '',
    detail: null,
    related: [],
    currentUser: null,
    isFav: false,
    loadingRelated: false,
    relatedReady: false,
    heroImageFailed: false,
  },

  async prepareDetail(detail = null) {
    if (!detail) return null
    const normalizedDetail = {
      ...detail,
      causes: (Array.isArray(detail.causes) && detail.causes.length)
        ? detail.causes.filter(Boolean)
        : ['暂无常见原因，可能是投稿内容尚未补全。'],
      solutions: (detail.solutions && detail.solutions.length) ? detail.solutions : [],
    }
    if (normalizedDetail.image_url && !normalizedDetail.heroThumbUrl) {
      normalizedDetail.heroThumbUrl = await resolveProblemThumbUrl(normalizedDetail.image_url, {
        width: 720,
        quality: 76,
      })
    }
    return normalizedDetail
  },

  mergeDetail(problemDetail = null, submission = null) {
    let detail = problemDetail || submission
    if (detail && submission) {
      const mergedSolutions = (detail.solutions && detail.solutions.length)
        ? detail.solutions
        : submission.solutions
      detail = {
        ...detail,
        sourceType: detail.sourceType || submission.sourceType,
        causes: (Array.isArray(detail.causes) && detail.causes.length)
          ? detail.causes
          : submission.causes,
        solutions: (Array.isArray(mergedSolutions) && mergedSolutions.length)
          ? mergedSolutions
          : [],
        image_url: detail.image_url || submission.image_url || '',
        tips: detail.tips || submission.tips || '',
      }
    }

    if (detail && submission) {
      if ((!Array.isArray(detail.causes) || !detail.causes.length) && submission.causes?.length) {
        detail.causes = submission.causes.filter(Boolean)
      }
      if ((!Array.isArray(detail.solutions) || !detail.solutions.length) && submission.solutions?.length) {
        detail.solutions = submission.solutions
      }
    }

    return detail
  },

  async onLoad(query) {
    const id = query.id || ''
    wx.hideLoading()
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    showAppLoading('加载中')
    this.setData({
      id,
      detail: null,
      related: [],
      currentUser: null,
      isFav: false,
      loadingRelated: false,
      relatedReady: false,
      heroImageFailed: false,
    })

    const problemDetailPromise = getProblemDetail(id)
    problemDetailPromise.then(async (detail) => {
      if (!detail || this.data.id !== id || this.data.detail) return
      const preparedDetail = await this.prepareDetail(detail)
      if (!preparedDetail || this.data.id !== id || this.data.detail) return
      this.setData({
        detail: preparedDetail,
        loadingRelated: true,
      })
      hideAppLoading()
    }).catch((error) => {
      console.warn('prepare cached problem detail failed', error)
    })

    try {
      const userPromise = getCurrentUser()
      const problemDetail = await problemDetailPromise
      const needsSubmission = !problemDetail
        || problemDetail.sourceType === 'submission'
        || !Array.isArray(problemDetail.causes)
        || !problemDetail.causes.length
        || !Array.isArray(problemDetail.solutions)
        || !problemDetail.solutions.length
      const submission = needsSubmission ? await getSubmissionDetail(id) : null
      const user = await userPromise
      const normalizedDetail = await this.prepareDetail(this.mergeDetail(problemDetail, submission))

      this.setData({
        id,
        currentUser: user,
        detail: normalizedDetail,
        related: [],
        isFav: false,
        loadingRelated: !!normalizedDetail,
        relatedReady: false,
      })
      if (!normalizedDetail) {
        wx.showToast({ title: '问题不存在或已删除', icon: 'none' })
        return
      }
      hideAppLoading()

      if (user?.id) {
        recordHistory(user.id, id).catch((error) => {
          console.warn('recordHistory failed', error)
        })
      }

      Promise.all([
        normalizedDetail.sourceType === 'submission' ? Promise.resolve([]) : getRelatedProblems(normalizedDetail),
        user?.id ? fetchFavorites(user.id) : Promise.resolve([]),
      ]).then(([related, favorites]) => {
        this.setData({
          related,
          isFav: favorites.includes(id),
          loadingRelated: false,
          relatedReady: true,
        })
      }).catch((error) => {
        console.warn('load problem detail secondary failed', error)
        this.setData({
          loadingRelated: false,
          relatedReady: true,
        })
      })
    } catch (error) {
      console.warn('load problem detail failed', error)
      wx.showToast({ title: '详情加载失败，请稍后重试', icon: 'none' })
    } finally {
      hideAppLoading()
    }
  },

  async toggleFavorite() {
    if (this.data.favoriteLoading) return
    let user = this.data.currentUser
    if (!user?.id) {
      user = await ensureUser()
    }
    if (!user?.id) {
      wx.showToast({ title: '微信登录暂不可用，请稍后再试', icon: 'none' })
      return
    }
    this.setData({ favoriteLoading: true })
    try {
      const next = await toggleFavorite(user.id, this.data.id)
      this.setData({ currentUser: user, isFav: next })
      wx.showToast({ title: next ? '已收藏' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggleFavorite failed', error)
      wx.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ favoriteLoading: false })
    }
  },

  openRelated(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    showAppLoading('正在打开')
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${id}`,
      complete: () => {
        hideAppLoading()
      },
    })
  },

  onHeroImageError() {
    this.setData({ heroImageFailed: true })
  },

  onShareAppMessage() {
    const detail = this.data.detail || {}
    const title = detail.title
      ? `${detail.title} | 别塌了模型`
      : '别塌了模型 | 3D打印排障助手'
    return {
      title,
      path: `/pages/problem-detail/index?id=${this.data.id}`,
      imageUrl: detail.image_url || '/images/home/problem-center.jpg',
    }
  },

  onShareTimeline() {
    const detail = this.data.detail || {}
    const title = detail.title
      ? `${detail.title} | 别塌了模型`
      : '别塌了模型 | 3D打印排障助手'
    return {
      title,
      query: `id=${this.data.id}`,
      imageUrl: detail.image_url || '/images/home/problem-center.jpg',
    }
  },
})
