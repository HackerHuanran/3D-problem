const PAGE_SIZE = 20
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

function pickDescription(item = {}) {
  return String(item.description || item.subtitle || item.causes?.[0] || '').trim()
}

Page({
  data: {
    loading: false,
    loadingMore: false,
    opLoading: false,
    opTargetId: '',
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasMore: true,
    keywordInput: '',
    keyword: '',
    problems: [],
    shouldRefresh: false,
  },

  onLoad() {
    this.guardAdmin()
  },

  onShow() {
    if (this.data.shouldRefresh) {
      this.setData({ shouldRefresh: false })
      this.loadProblems({ reset: true })
    }
  },

  async onPullDownRefresh() {
    await this.loadProblems({ reset: true })
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading || this.data.loadingMore) return
    this.loadProblems({ reset: false })
  },

  guardAdmin() {
    const user = getApp().globalData.currentUser || this.readCachedUser()
    if (!user?.id || !isAdminUser(user)) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    getApp().globalData.currentUser = user
    this.loadProblems({ reset: true })
  },

  readCachedUser() {
    try {
      return wx.getStorageSync('adminCurrentUser') || null
    } catch (error) {
      return null
    }
  },

  onKeywordInput(event) {
    this.setData({ keywordInput: event.detail.value })
  },

  search() {
    this.setData({ keyword: String(this.data.keywordInput || '').trim() })
    this.loadProblems({ reset: true })
  },

  clearSearch() {
    this.setData({ keywordInput: '', keyword: '' })
    this.loadProblems({ reset: true })
  },

  async resolveImages(problems = []) {
    const fileList = [...new Set(problems
      .map((item) => normalizeAsset(item.image_url))
      .filter((item) => item.startsWith('cloud://') && !imageCache[item]))]

    if (fileList.length) {
      try {
        await getApp().ensureCloud()
        const res = await getApp().getCloud().callFunction({
          name: 'miniappAuth',
          data: {
            action: 'resolveFileUrls',
            fileList,
          },
        })
        const result = res?.result || {}
        const urlMap = result.urlMap || {}
        fileList.forEach((fileID) => {
          if (urlMap[fileID]) imageCache[fileID] = urlMap[fileID]
        })
      } catch (error) {
        console.warn('resolve problem covers failed', error)
      }
    }

    return problems.map((item) => {
      const imageUrl = normalizeAsset(item.image_url)
      return {
        ...item,
        imageUrl,
        imageDisplayUrl: imageUrl.startsWith('cloud://') ? (imageCache[imageUrl] || '') : imageUrl,
        desc: pickDescription(item),
      }
    })
  },

  async loadProblems({ reset = false } = {}) {
    if (this.data.loading || this.data.loadingMore) return
    const nextPage = reset ? 1 : this.data.page + 1
    this.setData(reset ? { loading: true } : { loadingMore: true })
    if (reset) wx.showLoading({ title: '加载中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminListProblems',
          page: nextPage,
          pageSize: this.data.pageSize,
          keyword: this.data.keyword,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '加载失败')
      const rows = await this.resolveImages(result.problems || [])
      this.setData({
        problems: reset ? rows : this.data.problems.concat(rows),
        page: nextPage,
        total: Number(result.total || 0),
        hasMore: result.hasMore === true,
      })
    } catch (error) {
      wx.showModal({
        title: '加载失败',
        content: error?.message || '请检查云函数和 problems 集合权限',
        showCancel: false,
      })
      if (reset) {
        this.setData({ problems: [], total: 0, hasMore: false })
      }
    } finally {
      this.setData({ loading: false, loadingMore: false })
      wx.hideLoading()
    }
  },

  editProblem(event) {
    const docId = event.currentTarget.dataset.docId || ''
    const problemId = event.currentTarget.dataset.problemId || ''
    if (!docId && !problemId) return
    this.setData({ shouldRefresh: true })
    wx.navigateTo({
      url: `/pages/problem-edit/index?docId=${encodeURIComponent(docId)}&problemId=${encodeURIComponent(problemId)}`,
    })
  },

  deleteProblem(event) {
    const docId = event.currentTarget.dataset.docId || ''
    const problemId = event.currentTarget.dataset.problemId || ''
    const title = event.currentTarget.dataset.title || '这个问题'
    if (!docId && !problemId) return
    wx.showModal({
      title: '删除问题',
      content: `确定删除「${title}」吗？删除后问题库将不再显示，相关封面索引也会同步清理。`,
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: async (res) => {
        if (!res.confirm) return
        await this.confirmDeleteProblem({ docId, problemId })
      },
    })
  },

  async confirmDeleteProblem({ docId = '', problemId = '' } = {}) {
    this.setData({ opLoading: true, opTargetId: docId || problemId })
    wx.showLoading({ title: '删除中', mask: true })
    try {
      await getApp().ensureCloud()
      const res = await getApp().getCloud().callFunction({
        name: 'miniappAuth',
        data: {
          action: 'adminDeleteProblem',
          problemDocId: docId,
          problemId,
        },
      })
      const result = res?.result || {}
      if (result.ok === false) throw new Error(result.error || '删除失败')
      wx.showToast({ title: '已删除', icon: 'success' })
      const targetId = docId || problemId
      this.setData({
        problems: this.data.problems.filter((item) => item.docId !== targetId && item.problemId !== targetId),
        total: Math.max(0, this.data.total - 1),
      })
    } catch (error) {
      wx.showModal({
        title: '删除失败',
        content: error?.message || '请检查云函数和 problems 集合权限',
        showCancel: false,
      })
    } finally {
      this.setData({ opLoading: false, opTargetId: '' })
      wx.hideLoading()
    }
  },
})
