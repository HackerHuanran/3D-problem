const { listFilaments } = require('../../utils/filament-service')

Page({
  data: {
    query: '',
    activeMaterial: '全部',
    materials: ['全部', 'PLA', 'PLA+', 'PETG', 'TPU', 'ABS', 'ASA', '光固化树脂'],
    items: [],
  },

  async onLoad() {
    wx.hideLoading()
    wx.showLoading({ title: '正在加载' })
    try {
      await this.refreshList()
    } finally {
      wx.hideLoading()
    }
  },

  async refreshList() {
    const items = await listFilaments({
      material: this.data.activeMaterial,
      query: this.data.query,
      limit: 60,
    })
    this.setData({ items })
  },

  onQueryInput(e) {
    this.setData({ query: e.detail.value })
    this.refreshList()
  },

  selectMaterial(e) {
    this.setData({ activeMaterial: e.currentTarget.dataset.material })
    this.refreshList()
  },
})
