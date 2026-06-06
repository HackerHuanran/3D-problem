const { getCurrentUser } = require('../../utils/user-service')
const { showAppLoading, hideAppLoading } = require('../../utils/loading')

Page({
  data: {
    currentUser: null,
    addresses: [],
    mode: 'list',
    form: {
      id: '',
      recipient: '',
      phone: '',
      region: ['辽宁省', '沈阳市', ''],
      regionText: '',
      detail: '',
      isDefault: true,
    },
    saving: false,
    deletingId: '',
  },

  async onShow() {
    await this.loadPageData()
  },

  async loadPageData() {
    showAppLoading('加载中')
    try {
      const user = await getCurrentUser()
      if (!user?.id) {
        this.setData({
          currentUser: null,
          addresses: [],
        })
        return
      }
      this.setData({ currentUser: user })
      await this.loadAddresses(user.id)
    } finally {
      hideAppLoading()
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
      const addresses = (data || []).map((item) => ({
        id: item._id,
        recipient: item.recipient || '',
        phone: item.phone || '',
        region: item.region || [],
        regionText: item.region_text || '',
        detail: item.detail || '',
        isDefault: item.is_default === true,
        updatedAt: item.updated_at || item.created_at || null,
      })).sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
        return 0
      })
      this.setData({ addresses })
    } catch (error) {
      console.warn('load user addresses failed', error)
      this.setData({ addresses: [] })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({
      [`form.${field}`]: e.detail.value,
    })
  },

  onRegionChange(e) {
    const region = e.detail.value || []
    this.setData({
      'form.region': region,
      'form.regionText': region.join(' '),
    })
  },

  toggleDefault() {
    this.setData({
      'form.isDefault': !this.data.form.isDefault,
    })
  },

  openCreateForm() {
    this.resetForm()
    this.setData({ mode: 'form' })
  },

  closeForm() {
    this.resetForm()
    this.setData({ mode: 'list' })
  },

  resetForm() {
    this.setData({
      form: {
        id: '',
        recipient: '',
        phone: '',
        region: ['辽宁省', '沈阳市', ''],
        regionText: '',
        detail: '',
        isDefault: this.data.addresses.length === 0,
      },
    })
  },

  editAddress(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.addresses.find((row) => row.id === id)
    if (!item) return
    this.setData({
      mode: 'form',
      form: {
        id: item.id,
        recipient: item.recipient || '',
        phone: item.phone || '',
        region: item.region && item.region.length ? item.region : ['辽宁省', '沈阳市', ''],
        regionText: item.regionText || '',
        detail: item.detail || '',
        isDefault: item.isDefault === true,
      },
    })
  },

  async saveAddress() {
    if (this.data.saving) return
    const userId = this.data.currentUser?.id || ''
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const form = this.data.form || {}
    const recipient = String(form.recipient || '').trim()
    const phone = String(form.phone || '').trim()
    const detail = String(form.detail || '').trim()
    const region = Array.isArray(form.region) ? form.region.filter(Boolean) : []
    const regionText = String(form.regionText || region.join(' ') || '').trim()
    const isDefault = form.isDefault === true

    if (!recipient || !phone || !detail || region.length < 2) {
      wx.showToast({ title: '请完整填写地址', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    showAppLoading('保存中')
    const db = wx.cloud.database()
    try {
      if (isDefault) {
        for (const item of this.data.addresses) {
          if (item.id !== form.id && item.isDefault) {
            await db.collection('user_addresses').doc(item.id).update({
              data: {
                is_default: false,
                updated_at: db.serverDate(),
              },
            })
          }
        }
      }

      const payload = {
        user_id: userId,
        recipient,
        phone,
        region,
        region_text: regionText,
        detail,
        is_default: isDefault || this.data.addresses.length === 0,
        updated_at: db.serverDate(),
      }

      if (form.id) {
        await db.collection('user_addresses').doc(form.id).update({ data: payload })
      } else {
        await db.collection('user_addresses').add({
          data: {
            ...payload,
            created_at: db.serverDate(),
          },
        })
      }

      wx.showToast({ title: '已保存', icon: 'success' })
      this.resetForm()
      this.setData({ mode: 'list' })
      await this.loadAddresses(userId)
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查 user_addresses 集合和权限',
        showCancel: false,
      })
    } finally {
      this.setData({ saving: false })
      hideAppLoading()
    }
  },

  async setDefaultAddress(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.addresses.find((row) => row.id === id)
    if (!item) return
    showAppLoading('保存中')
    const db = wx.cloud.database()
    try {
      for (const row of this.data.addresses) {
        await db.collection('user_addresses').doc(row.id).update({
          data: {
            is_default: row.id === item.id,
            updated_at: db.serverDate(),
          },
        })
      }
      wx.showToast({ title: '已设为默认', icon: 'success' })
      await this.loadAddresses(this.data.currentUser.id)
    } catch (error) {
      wx.showModal({
        title: '设置失败',
        content: error?.message || '请检查数据库权限',
        showCancel: false,
      })
    } finally {
      hideAppLoading()
    }
  },

  deleteAddress(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.addresses.find((row) => row.id === id)
    if (!item) return
    wx.showModal({
      title: '删除地址',
      content: `确定删除「${item.recipient}」的收货地址吗？`,
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ deletingId: item.id })
        try {
          await wx.cloud.database().collection('user_addresses').doc(item.id).remove()
          if (this.data.form.id === item.id) {
            this.resetForm()
            this.setData({ mode: 'list' })
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          await this.loadAddresses(this.data.currentUser.id)
        } catch (error) {
          wx.showModal({
            title: '删除失败',
            content: error?.message || '请检查数据库权限',
            showCancel: false,
          })
        } finally {
          this.setData({ deletingId: '' })
        }
      },
    })
  },
})
