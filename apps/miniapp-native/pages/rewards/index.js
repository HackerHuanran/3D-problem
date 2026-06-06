const { getCurrentUser, getCurrentProfile } = require('../../utils/user-service')
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

function normalizeAddress(item = {}) {
  return {
    id: item.id || item._id || '',
    recipient: item.recipient || item.name || item.receiver || '',
    phone: item.phone || item.mobile || item.tel || '',
    region: item.region || [],
    regionText: item.regionText || item.region_text || '',
    detail: item.detail || item.detail_address || item.address || '',
    isDefault: item.isDefault === true || item.is_default === true,
  }
}

function sortAddresses(addresses = []) {
  return (addresses || []).sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    return 0
  })
}

Page({
  data: {
    currentUser: null,
    currentProfile: null,
    points: 0,
    goods: [],
    addresses: [],
    loading: false,
    redeemingId: '',
    addressSheetVisible: false,
    selectedGoods: null,
    selectedAddressId: '',
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
      console.warn('resolve reward image failed', error)
      return raw
    }
  },

  async loadPageData() {
    this.setData({ loading: true })
    showAppLoading('加载中')
    try {
      const user = await getCurrentUser()
      const profile = await getCurrentProfile()
      if (!user?.id) {
        this.setData({
          currentUser: null,
          currentProfile: null,
          points: 0,
          goods: [],
          addresses: [],
        })
        return
      }

      this.setData({
        currentUser: user,
        currentProfile: profile,
        points: Number(profile?.points || user?.points || 0),
      })

      await Promise.all([
        this.loadGoods(),
        this.loadAddresses(user.id),
      ])
    } finally {
      this.setData({ loading: false })
      hideAppLoading()
    }
  },

  async loadGoods() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('reward_goods')
        .orderBy('updated_at', 'desc')
        .limit(100)
        .get()
      const goods = await Promise.all((data || []).map(async (item) => ({
        id: item._id,
        name: item.name || '',
        imageUrl: normalizeAsset(item.image_url),
        imageDisplayUrl: await this.resolveCloudFile(item.image_url),
        quantity: Number(item.quantity || 0),
        pointsCost: Number(item.points_cost || item.pointsCost || 0),
      })))
      this.setData({ goods })
    } catch (error) {
      console.warn('load reward goods failed', error)
      this.setData({ goods: [] })
    }
  },

  async loadAddresses(userId) {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('user_addresses')
        .where({ user_id: userId })
        .orderBy('updated_at', 'desc')
        .limit(20)
        .get()
      const addresses = sortAddresses((data || []).map((item) => normalizeAddress(item)))
      if (addresses.length) {
        this.setData({ addresses })
        return
      }
    } catch (localError) {
      console.warn('load local addresses failed', localError)
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'getUserAddresses',
          limit: 20,
        },
      })
      const result = res?.result || {}
      if (result?.ok === false) {
        throw new Error(result?.error || '加载地址失败')
      }
      const addresses = sortAddresses((result.addresses || []).map((item) => normalizeAddress(item)))
      this.setData({ addresses })
    } catch (error) {
      console.warn('load addresses failed', error)
      this.setData({ addresses: [] })
    }
  },

  openAddressPage() {
    wx.navigateTo({ url: '/pages/address/index' })
  },

  noop() {},

  formatAddressLabel(address = {}) {
    const recipient = String(address.recipient || '').trim()
    const phone = String(address.phone || '').trim()
    const addressText = `${address.regionText || ''} ${address.detail || ''}`.trim()
    return `${recipient} ${phone} ${addressText}`.trim().slice(0, 40)
  },

  async ensureAddressesReady() {
    if (this.data.addresses.length) return this.data.addresses
    const userId = this.data.currentUser?.id || ''
    if (userId) {
      await this.loadAddresses(userId)
    }
    return this.data.addresses || []
  },

  async openAddressSheetForGoods(item) {
    const addresses = await this.ensureAddressesReady()
    if (!addresses.length) {
      return false
    }
    const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0]
    this.setData({
      addressSheetVisible: true,
      selectedGoods: item,
      selectedAddressId: defaultAddress?.id || '',
    })
    return true
  },

  closeAddressSheet() {
    if (this.data.redeemingId) return
    this.setData({
      addressSheetVisible: false,
      selectedGoods: null,
      selectedAddressId: '',
    })
  },

  selectAddress(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.setData({ selectedAddressId: id })
  },

  getSelectedAddress() {
    const id = this.data.selectedAddressId
    return (this.data.addresses || []).find((address) => address.id === id) || null
  },

  async redeemGoods(e) {
    const goodsId = e.currentTarget.dataset.id
    const item = this.data.goods.find((row) => row.id === goodsId)
    if (!item?.id) return
    if (!this.data.currentUser?.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const hasAddress = await this.openAddressSheetForGoods(item)
    if (!hasAddress) {
      wx.showModal({
        title: '请先填写地址',
        content: '兑换耗材前需要先填写收货地址。',
        confirmText: '去填写',
        success: (res) => {
          if (res.confirm) {
            this.openAddressPage()
          }
        },
      })
      return
    }
  },

  async confirmRedeem() {
    const item = this.data.selectedGoods
    const address = this.getSelectedAddress()
    if (!item?.id) return
    if (!address?.id) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }
    if (this.data.redeemingId) return

    wx.showModal({
      title: '确认兑换',
      content: `确定使用 ${item.pointsCost} 积分兑换「${item.name}」吗？\n\n收货地址：${this.formatAddressLabel(address)}`,
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ redeemingId: item.id })
        showAppLoading('处理中')
        try {
          const result = await wx.cloud.callFunction({
            name: 'miniappAuth',
            data: {
              action: 'redeemRewardGoods',
              goodsId: item.id,
              addressId: address.id,
            },
          })
          if (result?.result?.ok === false) {
            throw new Error(result?.result?.error || '兑换失败')
          }
          this.closeAddressSheet()
          wx.showToast({ title: '兑换成功', icon: 'success' })
          await this.loadPageData()
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2]
          if (prevPage && typeof prevPage.loadAccountData === 'function') {
            prevPage.loadAccountData()
          }
        } catch (error) {
          wx.showModal({
            title: '兑换失败',
            content: error?.message || '请检查积分商品和地址配置',
            showCancel: false,
          })
        } finally {
          this.setData({ redeemingId: '' })
          hideAppLoading()
        }
      },
    })
  },
})
