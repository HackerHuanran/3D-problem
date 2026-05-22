const { getProblemDetail, getRelatedProblems } = require('../../utils/problem-service')
const { getCurrentUser, ensureUser, fetchFavorites, toggleFavorite, recordHistory, getSubmissionDetail } = require('../../utils/user-service')

Page({
  data: {
    id: '',
    detail: null,
    related: [],
    currentUser: null,
    isFav: false,
  },

  async onLoad(query) {
    const id = query.id || ''
    wx.hideLoading()
    wx.showLoading({ title: '正在加载' })
    try {
      const user = await getCurrentUser()
      const submission = await getSubmissionDetail(id)
      let detail = await getProblemDetail(id)
      if (!detail) {
        detail = submission
      }

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

      const related = detail?.sourceType === 'submission' ? [] : await getRelatedProblems(detail)
      const favorites = await fetchFavorites(user?.id)
      if (user?.id) {
        await recordHistory(user.id, id)
      }

      const normalizedDetail = detail ? {
        ...detail,
        causes: (Array.isArray(detail.causes) && detail.causes.length)
          ? detail.causes.filter(Boolean)
          : ['暂无常见原因，可能是投稿内容尚未补全。'],
        solutions: (detail.solutions && detail.solutions.length) ? detail.solutions : [],
      } : null

      if (submission) {
        if ((!Array.isArray(normalizedDetail?.causes) || !normalizedDetail.causes.length) && submission.causes?.length) {
          normalizedDetail.causes = submission.causes.filter(Boolean)
        }
        if ((!Array.isArray(normalizedDetail?.solutions) || !normalizedDetail.solutions.length) && submission.solutions?.length) {
          normalizedDetail.solutions = submission.solutions
        }
      }

      this.setData({
        id,
        currentUser: user,
        detail: normalizedDetail,
        related,
        isFav: favorites.includes(id),
      })
      if (!normalizedDetail) {
        wx.showToast({ title: '问题不存在或已删除', icon: 'none' })
      }
    } catch (error) {
      console.warn('load problem detail failed', error)
      wx.showToast({ title: '详情加载失败，请稍后重试', icon: 'none' })
    } finally {
      wx.hideLoading()
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
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },
})
