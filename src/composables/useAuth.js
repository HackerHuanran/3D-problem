import { ref } from 'vue'
import { auth, db } from '@/lib/tcb.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkImage } from '@/lib/moderate.js'

const currentUser = ref(null)
const CDN_BASE = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'
let logoutInFlight = false

function normalizeAdminFlag(profile = {}) {
  const direct = profile?.isAdmin
  if (direct === true || direct === 1) return true
  const text = String(direct ?? '').trim().toLowerCase()
  if (['true', '1', 'yes', 'admin', 'root'].includes(text)) return true

  const role = String(profile?.role ?? '').trim().toLowerCase()
  if (['admin', 'administrator', 'root'].includes(role)) return true

  const roles = Array.isArray(profile?.roles) ? profile.roles : []
  return roles.some((item) => ['admin', 'administrator', 'root'].includes(String(item).trim().toLowerCase()))
}

function scoreProfile(profile = {}, uid = '') {
  let score = 0
  if (!profile || typeof profile !== 'object') return score
  if (profile._id === uid) score += 6
  if (profile.uid === uid) score += 6
  if (normalizeAdminFlag(profile)) score += 20
  if (String(profile.username || '').trim()) score += 3
  if (String(profile.avatar || '').trim()) score += 2
  if (String(profile.phone || '').trim()) score += 1
  return score
}

function buildFallbackUser(uid, profile = {}) {
  const rawName = String(profile?.username || '').trim()
  const username = rawName || `用户${String(uid || '').slice(-4).toUpperCase()}`
  return {
    id: uid,
    username,
    avatar: profile?.avatar || username[0]?.toUpperCase() || '?',
    phone: profile?.phone || '',
    points: profile?.points ?? 0,
    isAdmin: normalizeAdminFlag(profile),
    needsProfile: !rawName,
  }
}

async function findProfile(uid) {
  try {
    const { data } = await db.collection('profiles').where({ uid }).limit(20).get()
    const matches = Array.isArray(data) ? data.filter(Boolean) : []
    if (matches.length > 0) {
      return matches
        .slice()
        .sort((a, b) => scoreProfile(b, uid) - scoreProfile(a, uid))[0] || null
    }

    try {
      const record = await db.collection('profiles').doc(uid).get()
      return record?.data?.[0] || record?.data || null
    } catch {
      return null
    }
  } catch {
    return null
  }
}

async function loadProfile(uid) {
  const profile = await findProfile(uid)
  if (!profile) {
    currentUser.value = null
    return null
  }
  currentUser.value = buildFallbackUser(uid, profile)
  return profile
}

async function resolveRealUserSession(loginState) {
  if (!loginState?.user?.uid) {
    currentUser.value = null
    return false
  }

  const loginType = loginState.loginType?.toUpperCase?.() || ''
  if (loginType === 'ANONYMOUS') {
    currentUser.value = null
    return false
  }

  if (logoutInFlight) {
    currentUser.value = null
    return false
  }

  if (loginType) {
    return !!(await loadProfile(loginState.user.uid))
  }

  const profile = await findProfile(loginState.user.uid)
  if (!profile) {
    currentUser.value = null
    return false
  }
  currentUser.value = buildFallbackUser(loginState.user.uid, profile)
  return true
}

// 监听登录状态变化
auth.onLoginStateChanged(async loginState => {
  if (logoutInFlight) {
    currentUser.value = null
    return
  }
  await resolveRealUserSession(loginState)
})

// 启动时恢复 session
;(async () => {
  try {
    const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
    const loginState = await Promise.race([auth.getLoginState(), timeout])
    if (loginState?.user?.uid) {
      await resolveRealUserSession(loginState)
    }
  } catch {}
})()

export function useAuth() {

  const checkUsername = async (username) => {
    try {
      const { data: existing } = await db.collection('profiles')
        .where({ username }).limit(1).get()
      if (existing?.length > 0) throw new Error('用户名已被占用')
    } catch (e) {
      if (e.message === '用户名已被占用') throw e
      console.warn('username check skipped:', e.message)
    }
  }

  const requestPhoneCode = async (phone, password) => {
    if (!phone) throw new Error('请输入手机号')
    if (!password || password.length < 6) throw new Error('密码至少6位')
    let result
    try {
      result = await auth.signUp({ phone, password })
    } catch (e) {
      const msg = e?.error_description || e?.message || JSON.stringify(e)
      throw new Error('发送失败：' + msg)
    }
    if (!result?.data?.verifyOtp) throw new Error('发送失败，请重试')
    return result.data.verifyOtp
  }

  const confirmCode = async (verifyOtpFn, code, username, phone) => {
    if (!verifyOtpFn) throw new Error('请先获取验证码')
    let verifyRes
    try {
      verifyRes = await verifyOtpFn({ token: code })
    } catch (e) {
      const msg = e?.error_description || e?.message || JSON.stringify(e)
      throw new Error('验证失败：' + msg)
    }
    if (verifyRes?.error) throw new Error(verifyRes.error.message || '验证失败')

    const loginState = await auth.getLoginState()
    if (!loginState?.user?.uid) throw new Error('注册失败，请重试')
    const uid = loginState.user.uid

    await db.collection('profiles').doc(uid).set({
      uid, username, avatar: username[0].toUpperCase(), phone, points: 0,
    })
    currentUser.value = { id: uid, username, avatar: username[0].toUpperCase(), phone, points: 0, isAdmin: false, needsProfile: false }
  }

  const login = async (phone, password) => {
    try {
      await auth.signInWithPhoneCodeOrPassword({ phoneNumber: phone, password })
    } catch (e) {
      const msg = e?.error_description || e?.message || '手机号或密码错误'
      throw new Error(msg)
    }
    // 登录成功即可信任，直接用 uid 加载资料，不再走 isRealUser 判断
    const loginState = await auth.getLoginState()
    if (loginState?.user?.uid) await loadProfile(loginState.user.uid)
  }

  const requestPasswordReset = async (phone) => {
    if (!phone) throw new Error('请输入手机号')
    const res = await auth.resetPasswordForEmail(phone)
    if (res?.error) {
      const msg = res.error?.error_description || res.error?.message || '验证码发送失败，请重试'
      throw new Error(msg)
    }
    if (!res?.data?.updateUser) throw new Error('验证码发送失败，请重试')
    return res.data.updateUser
  }

  const confirmPasswordReset = async (updateUserFn, code, password) => {
    if (!updateUserFn) throw new Error('请先获取验证码')
    if (!code?.trim()) throw new Error('请输入验证码')
    if (!password) throw new Error('请输入新密码')

    const res = await updateUserFn({ nonce: code.trim(), password })
    if (res?.error) {
      const msg = res.error?.error_description || res.error?.message || '重置失败，请重试'
      throw new Error(msg)
    }

    const loginState = await auth.getLoginState()
    if (loginState?.user?.uid) await loadProfile(loginState.user.uid)
    return true
  }

  const setupProfile = async (username) => {
    if (!currentUser.value?.id) throw new Error('请先登录')
    if (!username?.trim()) throw new Error('请输入用户名')
    const uid = currentUser.value.id

    try {
      const { data: existing } = await db.collection('profiles')
        .where({ username: username.trim() }).limit(1).get()
      if (existing?.length > 0) throw new Error('用户名已被占用')
    } catch (e) {
      if (e.message === '用户名已被占用') throw e
    }

    try {
      const { data: rows } = await db.collection('profiles').where({ uid }).limit(1).get()
      if (rows?.length > 0) {
        await db.collection('profiles').doc(rows[0]._id).update({
          username: username.trim(),
          avatar:   username.trim()[0].toUpperCase(),
        })
      } else {
        await db.collection('profiles').doc(uid).set({
          uid,
          username: username.trim(),
          avatar:   username.trim()[0].toUpperCase(),
          phone:    currentUser.value.phone || '',
          points:   0,
        })
      }
    } catch (e) {
      throw new Error('设置失败：' + (e?.message || JSON.stringify(e)))
    }

    currentUser.value = {
      ...currentUser.value,
      username: username.trim(),
      avatar:   username.trim()[0].toUpperCase(),
      needsProfile: false,
    }
  }

  const updateAvatar = async (file) => {
    if (!currentUser.value?.id) throw new Error('请先登录')
    if (!file) throw new Error('请选择头像图片')

    const compressed = await compressImage(file, 360, 0.72)
    const { pass, msg } = await checkImage(compressed)
    if (!pass) throw new Error(msg)

    const cloudPath = `avatars/${currentUser.value.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    await app.uploadFile({ cloudPath, filePath: compressed })
    const avatarUrl = `${CDN_BASE}/${cloudPath}`

    const uid = currentUser.value.id
    const { data: rows } = await db.collection('profiles').where({ uid }).limit(1).get()

    if (rows?.length > 0) {
      await db.collection('profiles').doc(rows[0]._id).update({
        avatar: avatarUrl,
      })
    } else {
      await db.collection('profiles').doc(uid).set({
        uid,
        username: currentUser.value.username || `用户${String(uid).slice(-4).toUpperCase()}`,
        avatar: avatarUrl,
        phone: currentUser.value.phone || '',
        points: currentUser.value.points ?? 0,
        isAdmin: currentUser.value.isAdmin ? true : false,
      })
    }

    currentUser.value = {
      ...currentUser.value,
      avatar: avatarUrl,
    }

    return avatarUrl
  }

  const changePassword = async (oldPassword, newPassword) => {
    if (!newPassword || newPassword.length < 6) throw new Error('新密码至少6位')
    const { data, error } = await auth.getUser()
    if (error || !data?.user) throw new Error('获取用户信息失败')
    try {
      await data.user.updatePassword(newPassword, oldPassword)
    } catch (e) {
      throw new Error('修改失败：' + (e?.error_description || e?.message || JSON.stringify(e)))
    }
  }

  const logout = async () => {
    logoutInFlight = true
    currentUser.value = null
    try { await auth.signOut() } catch {}
    currentUser.value = null
    logoutInFlight = false
  }

  const init = async () => {
    try {
      const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
      const loginState = await Promise.race([auth.getLoginState(), timeout])
      if (loginState?.user?.uid) {
        await resolveRealUserSession(loginState)
      } else {
        currentUser.value = null
      }
    } catch {}
  }

  return {
    currentUser,
    checkUsername,
    requestPhoneCode,
    confirmCode,
    login,
    requestPasswordReset,
    confirmPasswordReset,
    setupProfile,
    updateAvatar,
    changePassword,
    logout,
    init,
  }
}
