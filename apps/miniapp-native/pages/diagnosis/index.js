const { getDiagnosisCandidates } = require('../../utils/problem-service')

Page({
  data: {
    stages: [
      { id: 'before', label: '刚开始就失败' },
      { id: 'first-layer', label: '第一层异常' },
      { id: 'mid-print', label: '打印到一半出事' },
      { id: 'surface', label: '能打完但质量差' },
    ],
    printers: [
      { id: 'all', label: '不限机型' },
      { id: 'FDM', label: 'FDM' },
      { id: 'SLA', label: 'SLA 光固化' },
    ],
    materials: [
      { id: 'any', label: '不限材料' },
      { id: 'pla', label: 'PLA' },
      { id: 'petg', label: 'PETG' },
      { id: 'abs-asa', label: 'ABS / ASA' },
      { id: 'tpu', label: 'TPU' },
      { id: 'resin', label: '树脂' },
    ],
    stageId: 'before',
    printerId: 'all',
    materialId: 'any',
    candidates: [],
  },

  async onLoad() {
    await this.refreshCandidates()
  },

  async refreshCandidates() {
    const candidates = await getDiagnosisCandidates({
      stageId: this.data.stageId,
      printer: this.data.printerId,
      material: this.data.materialId,
    })
    this.setData({ candidates })
  },

  selectChip(e) {
    const { type, id } = e.currentTarget.dataset
    if (type === 'stage') this.setData({ stageId: id })
    if (type === 'printer') this.setData({ printerId: id })
    if (type === 'material') this.setData({ materialId: id })
    this.refreshCandidates()
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
  },
})
