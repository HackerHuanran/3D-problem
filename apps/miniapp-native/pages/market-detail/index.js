const { getMarketPostDetail } = require('../../utils/market-service')

Page({
  data: {
    id: '',
    detail: null,
    missingCollection: '',
    loadError: '',
  },

  async onLoad(query) {
    const id = query.id || ''
    const result = await getMarketPostDetail(id)
    this.setData({
      id,
      detail: result.detail || null,
      missingCollection: result.missingCollection || '',
      loadError: result.error || '',
    })
  },
})
