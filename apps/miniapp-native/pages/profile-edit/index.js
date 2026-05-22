const { getCurrentUser, getCurrentProfile, ensureUser, getUserCacheKeys } = require('../../utils/user-service')

Page({
  data: {
    currentUser: null,
    currentProfile: null,
    username: '',
    phone: '',
    gender: 'unknown',
    avatarUrl: '',
    avatarDisplayUrl: '',
    saving: false,
  },

  async onLoad() {
    await this.loadProfile()
  },

  async loadProfile() {
    const user = await getCurrentUser()
    const profile = await getCurrentProfile()
    const cachedDisplayUser = (() => {
      try {
        const { currentUserDisplayKey } = getUserCacheKeys(user?.id || '')
        return wx.getStorageSync(currentUserDisplayKey) || null
      } catch (error) {
        return null
      }
    })()
    const currentUser = {
      ...(user || {}),
      ...(cachedDisplayUser || {}),
      ...(profile || {}),
      id: user?.id || user?.uid || cachedDisplayUser?.id || cachedDisplayUser?.uid || '',
      username: profile?.username || cachedDisplayUser?.username || user?.username || '微信用户',
      avatarUrl: profile?.avatarUrl || cachedDisplayUser?.avatarUrl || user?.avatarUrl || '',
      avatarText: (profile?.username || cachedDisplayUser?.username || user?.username || '微').slice(0, 1),
    }
    const avatarDisplayUrl = await this.resolveAvatarDisplayUrl(currentUser.avatarUrl)

    this.setData({
      currentUser,
      currentProfile: profile,
      username: currentUser.username || '',
      phone: profile?.phone || cachedDisplayUser?.phone || user?.phone || '',
      gender: String(profile?.gender ?? cachedDisplayUser?.gender ?? user?.gender ?? 'unknown'),
      avatarUrl: currentUser.avatarUrl || '',
      avatarDisplayUrl,
    })
  },

  async resolveAvatarDisplayUrl(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (!raw.startsWith('cloud://')) return raw

    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [raw] })
      return res?.fileList?.[0]?.tempFileURL || raw
    } catch (error) {
      console.warn('resolve edit avatar failed', error)
      return raw
    }
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail.value })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]?.tempFilePath
        if (file) {
          this.setData({ avatarUrl: file, avatarDisplayUrl: file })
        }
      },
    })
  },

  async saveProfile() {
    const cachedUser = await getCurrentUser()
    const user = cachedUser?.id ? cachedUser : await ensureUser()
    if (!user?.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const username = String(this.data.username || '').trim()
    const phone = String(this.data.phone || '').trim()
    const gender = String(this.data.gender || 'unknown')

    this.setData({ saving: true })
    try {
      let avatarUrl = this.data.avatarUrl || ''
      if (avatarUrl && !String(avatarUrl).startsWith('http') && !String(avatarUrl).startsWith('cloud://')) {
        const ext = (avatarUrl.split('.').pop() || 'jpg').toLowerCase()
        const cloudPath = `profile-avatars/${user.id}/${Date.now()}.${ext}`
        const upload = await wx.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl,
        })
        avatarUrl = upload.fileID || ''
      }

      const saveRes = await wx.cloud.callFunction({
        name: 'miniappAuth',
        data: {
          action: 'saveProfile',
          profile: {
            username: username || '微信用户',
            phone,
            gender,
            avatarUrl,
          },
        },
      })

      if (saveRes?.result?.ok === false) {
        throw new Error(saveRes?.result?.error || '保存资料失败')
      }

      const savedUser = saveRes?.result?.user || {}
      const updatedProfile = {
        id: savedUser.id || user.id,
        uid: savedUser.uid || user.id,
        username: savedUser.username || username || '微信用户',
        avatarUrl: savedUser.avatarUrl || avatarUrl,
        avatar: savedUser.avatar || (username ? username.slice(0, 1) : '微'),
        phone: savedUser.phone || phone,
        gender: savedUser.gender || gender,
        source: 'miniapp_profile_edit',
        profileEdited: true,
        updated_at: new Date(),
      }
      const updatedUser = {
        ...(user || {}),
        ...savedUser,
        ...updatedProfile,
        id: savedUser.id || user.id || user.uid || '',
        avatarText: updatedProfile.avatar,
        displayName: updatedProfile.username,
        rawAvatarUrl: updatedProfile.avatarUrl,
        hasAvatarImage: !!updatedProfile.avatarUrl,
      }
      updatedUser.avatarDisplayUrl = await this.resolveAvatarDisplayUrl(updatedProfile.avatarUrl)
      updatedUser.avatarSrc = updatedUser.avatarDisplayUrl || updatedProfile.avatarUrl
      getApp().globalData.currentUser = updatedUser
      try {
        const keys = getUserCacheKeys(updatedUser.id)
        wx.setStorageSync(keys.currentUserKey, updatedUser)
        wx.setStorageSync(keys.currentUserDisplayKey, updatedUser)
        wx.setStorageSync(keys.lastWechatProfileKey, {
          nickName: updatedProfile.username,
          avatarUrl: updatedProfile.avatarUrl,
        })
        wx.setStorageSync('currentUser', updatedUser)
        wx.setStorageSync('currentUserDisplay', updatedUser)
        wx.setStorageSync('lastWechatProfile', {
          nickName: updatedProfile.username,
          avatarUrl: updatedProfile.avatarUrl,
        })
      } catch (storageError) {
        console.warn('sync updated profile cache failed', storageError)
      }
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      if (prevPage && typeof prevPage.loadAccountData === 'function') {
        prevPage.setData({
          currentUser: updatedUser,
          currentProfile: {
            ...(this.data.currentProfile || {}),
            ...updatedProfile,
          },
          isAdmin: !!(updatedUser.isAdmin || this.data.currentProfile?.isAdmin),
        })
        prevPage.loadAccountData()
      }

      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.showModal({
        title: '保存失败',
        content: error?.message || '请检查 miniappAuth 云函数是否已重新部署',
        showCancel: false,
      })
    } finally {
      this.setData({ saving: false })
    }
  },
})
