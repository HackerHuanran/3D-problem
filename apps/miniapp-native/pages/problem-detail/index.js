const { getProblemDetail, getRelatedProblems, resolveProblemThumbUrl } = require('../../utils/problem-service')
const { requireLoginForAction, fetchFavorites, toggleFavorite, recordHistory, getSubmissionDetail, fetchProblemReactionStates, toggleProblemLike, toggleProblemDislike } = require('../../utils/user-service')
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
    expandedStepMap: {},
    reactionLoading: false,
  },

  async resolveDetailImageUrl(value = '', { width = 720, quality = 76 } = {}) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (raw.startsWith('/images/')) return raw
    let publicUrl = raw
    if (raw.startsWith('cloud://')) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
        publicUrl = res?.fileList?.[0]?.tempFileURL || raw
      } catch (error) {
        console.warn('resolve step image failed', error)
      }
    }
    return resolveProblemThumbUrl(publicUrl, { width, quality })
  },

  async prepareDetail(detail = null) {
    if (!detail) return null
    const solutions = Array.isArray(detail.solutions) ? detail.solutions : []
    const normalizedSolutions = await Promise.all(solutions.map(async (solution, index) => {
      const imageUrl = solution.image_url || solution.image || ''
      const imageThumbUrl = imageUrl
        ? await this.resolveDetailImageUrl(imageUrl, { width: 720, quality: 76 })
        : ''
      return {
        ...solution,
        step: solution.step || index + 1,
        title: solution.title || `步骤 ${solution.step || index + 1}`,
        detail: solution.detail || solution.text || '',
        image_url: imageUrl,
        imageThumbUrl,
        imagePreviewUrl: imageUrl ? (imageUrl.startsWith('cloud://') ? imageThumbUrl : imageUrl) : '',
      }
    }))
    const normalizedDetail = {
      ...detail,
      causes: (Array.isArray(detail.causes) && detail.causes.length)
        ? detail.causes.filter(Boolean)
        : ['暂无常见原因，可能是投稿内容尚未补全。'],
      solutions: normalizedSolutions,
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
    const loginUser = await requireLoginForAction('请先登录后查看详情')
    if (!loginUser?.id) return

    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    showAppLoading('加载中')
    this.setData({
      id,
      detail: null,
      related: [],
      currentUser: loginUser,
      isFav: false,
      loadingRelated: false,
      relatedReady: false,
      heroImageFailed: false,
      expandedStepMap: {},
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
      const problemDetail = await problemDetailPromise
      const needsSubmission = !problemDetail
        || problemDetail.sourceType === 'submission'
        || !Array.isArray(problemDetail.causes)
        || !problemDetail.causes.length
        || !Array.isArray(problemDetail.solutions)
        || !problemDetail.solutions.length
      const submission = needsSubmission ? await getSubmissionDetail(id) : null
      const user = loginUser
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

      recordHistory(user.id, id).catch((error) => {
        console.warn('recordHistory failed', error)
      })
      this.loadProblemReactions(user.id, id)

      Promise.all([
        normalizedDetail.sourceType === 'submission' ? Promise.resolve([]) : getRelatedProblems(normalizedDetail),
        fetchFavorites(user.id),
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

  async loadProblemReactions(userId = this.data.currentUser?.id || '', problemId = this.data.id) {
    if (!problemId || !this.data.detail) return
    try {
      const { counts, likedIds, dislikeCounts, dislikedIds } = await fetchProblemReactionStates(userId, [problemId])
      const likedSet = new Set(likedIds || [])
      const dislikedSet = new Set(dislikedIds || [])
      this.setData({
        detail: {
          ...this.data.detail,
          likeCount: Number(counts?.[problemId] ?? this.data.detail.likeCount ?? 0),
          liked: likedSet.has(problemId),
          dislikeCount: Number(dislikeCounts?.[problemId] ?? this.data.detail.dislikeCount ?? 0),
          disliked: dislikedSet.has(problemId),
        },
      })
    } catch (error) {
      console.warn('load problem detail reactions failed', error)
    }
  },

  async toggleProblemLike() {
    if (!this.data.id || this.data.reactionLoading) return
    let user = this.data.currentUser
    if (!user?.id) {
      user = await requireLoginForAction('请先登录后点赞')
      if (!user?.id) return
      this.setData({ currentUser: user })
    }
    this.setData({ reactionLoading: true })
    try {
      const result = await toggleProblemLike(user.id, this.data.id)
      this.updateProblemReaction(result)
      wx.showToast({ title: result.liked ? '已点赞' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle problem detail like failed', error)
      wx.showToast({ title: '操作失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ reactionLoading: false })
    }
  },

  async toggleProblemDislike() {
    if (!this.data.id || this.data.reactionLoading) return
    let user = this.data.currentUser
    if (!user?.id) {
      user = await requireLoginForAction('请先登录后操作')
      if (!user?.id) return
      this.setData({ currentUser: user })
    }
    this.setData({ reactionLoading: true })
    try {
      const result = await toggleProblemDislike(user.id, this.data.id)
      this.updateProblemReaction(result)
      wx.showToast({ title: result.disliked ? '已标记' : '已取消', icon: 'success' })
    } catch (error) {
      console.warn('toggle problem detail dislike failed', error)
      wx.showToast({ title: '操作失败，请检查集合权限', icon: 'none' })
    } finally {
      this.setData({ reactionLoading: false })
    }
  },

  updateProblemReaction(result = {}) {
    const detail = this.data.detail || {}
    this.setData({
      detail: {
        ...detail,
        liked: result.liked,
        likeCount: result.count,
        disliked: result.disliked,
        dislikeCount: result.dislikeCount,
      },
    })
  },

  async toggleFavorite() {
    if (this.data.favoriteLoading) return
    let user = this.data.currentUser
    if (!user?.id) {
      user = await requireLoginForAction('请先登录后收藏')
      if (!user?.id) return
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

  async openRelated(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const user = await requireLoginForAction('请先登录后查看详情')
    if (!user?.id) return
    showAppLoading('正在打开')
    wx.navigateTo({
      url: `/pages/problem-detail/index?id=${id}`,
      complete: () => {
        hideAppLoading()
      },
    })
  },

  toggleStep(e) {
    const key = String(e.currentTarget.dataset.key || '').trim()
    if (!key) return
    this.setData({
      [`expandedStepMap.${key}`]: !this.data.expandedStepMap[key],
    })
  },

  previewStepImage(e) {
    const url = String(e.currentTarget.dataset.url || '').trim()
    if (!url) return
    wx.previewImage({
      current: url,
      urls: [url],
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
