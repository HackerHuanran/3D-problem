const { getCurrentUser } = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

function normalizeAsset(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    return String(
      value.fileID
      || value.fileId
      || value.cloudPath
      || value.cloud_path
      || value.url
      || value.src
      || value.path
      || value.tempFileURL
      || value.tempFileUrl
      || value.download_url
      || ''
    ).trim()
  }
  return String(value).trim()
}

Page({
  data: {
    currentUser: null,
    orders: [],
    loading: false,
  },

  async onShow() {
    await this.loadPageData()
  },

  async resolveCloudFile(value) {
    const raw = normalizeAsset(value)
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      return res?.fileList?.[0]?.tempFileURL || res?.fileList?.[0]?.download_url || raw
    } catch (error) {
      console.warn('resolve order image failed', error)
      return raw
    }
  },

  async loadPageData() {
    const user = await getCurrentUser()
    if (!user?.id) {
      this.setData({
        currentUser: null,
        orders: [],
      })
      return
    }

    this.setData({
      currentUser: user,
      loading: true,
    })
    showAppLoading('加载中')
    try {
      const res = await wx.cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'getRewardOrders',
          limit: 50,
        },
      })
      const result = res?.result || {}
      if (result?.ok === false) {
        throw new Error(result?.error || '加载兑换记录失败')
      }
      const orders = await Promise.all((result.orders || []).map(async (item) => ({
        id: item.id || item._id || '',
        goodsName: item.goodsName || '',
        goodsImage: normalizeAsset(item.goodsImage),
        goodsImageDisplay: await this.resolveCloudFile(item.goodsImage),
        pointsCost: Number(item.pointsCost || 0),
        statusText: item.statusText || '',
        trackingNo: item.trackingNo || '',
        addressText: `${item.addressSnapshot?.region_text || ''} ${item.addressSnapshot?.detail || ''}`.trim(),
      })))
      this.setData({ orders })
    } catch (error) {
      console.warn('load reward orders failed', error)
      this.setData({ orders: [] })
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      hideAppLoading()
    }
  },
})
