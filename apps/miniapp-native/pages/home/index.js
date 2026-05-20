const { getCurrentUser, fetchHistory } = require('../../utils/user-service')
const { countProblems } = require('../../utils/problem-service')

Page({
  data: {
    currentUser: null,
    historyProblems: [],
    loading: false,
    searchValue: '',
    problemCount: 0,
    entryCards: [
      {
        id: 'library',
        title: '查找问题',
        desc: '翘边、拉丝、堵嘴、层移，先来这里查',
        image: '/assets/home-cards/problem-search.svg',
        layout: 'hero',
      },
      {
        id: 'filament',
        title: '耗材库',
        desc: '查推荐温度、速度和材料特性',
        image: '/assets/home-cards/filament-library.svg',
        layout: 'half',
      },
      {
        id: 'knowledge',
        title: '知识库',
        desc: '新手入门、参数解释与维护常识',
        image: '/assets/home-cards/knowledge-base.svg',
        layout: 'half',
      },
    ],
  },

  async loadHomeData() {
    this.setData({ loading: true })
    try {
      const [user, problemCount] = await Promise.all([
        getCurrentUser(),
        countProblems(),
      ])
      const history = await fetchHistory(user?.id)

      const historyProblems = []
      for (const row of history) {
        const { getProblemDetail } = require('../../utils/problem-service')
        const detail = await getProblemDetail(row.problem_id)
        if (detail) historyProblems.push(detail)
      }

      this.setData({
        currentUser: user,
        historyProblems,
        problemCount,
        loading: false,
      })
    } catch (error) {
      console.error('home onLoad failed', error)
      this.setData({ loading: false })
      wx.showToast({ title: '首页加载失败', icon: 'none' })
    }
  },

  async onLoad() {
    await this.loadHomeData()
  },

  async onShow() {
    await this.loadHomeData()
  },

  openEntry(e) {
    const id = e.currentTarget.dataset.id
    if (id === 'library') {
      wx.navigateTo({ url: '/pages/library/index' })
      return
    }
    if (id === 'filament') {
      wx.navigateTo({ url: '/pages/filament/index' })
      return
    }
    if (id === 'knowledge') {
      wx.navigateTo({ url: '/pages/knowledge/index' })
    }
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },

  goDiagnosis() {
    wx.navigateTo({ url: '/pages/diagnosis/index' })
  },

  goAccount() {
    wx.navigateTo({ url: '/pages/account/index' })
  },

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value })
  },

  searchProblems() {
    const keyword = String(this.data.searchValue || '').trim()
    wx.navigateTo({
      url: `/pages/library/index${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`,
    })
  },

  goShareProblem() {
    wx.navigateTo({ url: '/pages/problem-submit/index' })
  },
})
