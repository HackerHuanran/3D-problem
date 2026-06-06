const { listFilaments } = require('../../utils/filament-service')
const { withAppLoading } = require('../../utils/loading')

Page({
  data: {
    query: '',
    activeMaterial: '全部',
    materials: ['全部', 'PLA', 'PLA+', 'PETG', 'TPU', 'ABS', 'ASA', '光固化树脂'],
    items: [],
    searchTimer: null,
  },

  async onLoad() {
    await withAppLoading(() => this.refreshList(), '加载中')
  },

  async onPullDownRefresh() {
    try {
      await this.refreshList()
    } finally {
      wx.stopPullDownRefresh()
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
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }
    const searchTimer = setTimeout(() => {
      this.refreshList()
    }, 220)
    this.setData({ searchTimer })
  },

  selectMaterial(e) {
    this.setData({ activeMaterial: e.currentTarget.dataset.material })
    this.refreshList()
  },

  onUnload() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }
  },
})
