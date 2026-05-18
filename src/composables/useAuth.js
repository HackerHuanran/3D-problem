import { ref } from 'vue'
import { auth, db } from '@/lib/tcb.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkImage } from '@/lib/moderate.js'

const currentUser = ref(null)
const CDN_BASE = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'

function buildFallbackUser(uid, profile = {}) {
  const rawName = String(profile?.username || '').trim()
  const username = rawName || `用户${String(uid || '').slice(-4).toUpperCase()}`
  return {
    id: uid,
    username,
    avatar: profile?.avatar || username[0]?.toUpperCase() || '?',
    phone: profile?.phone || '',
    points: profile?.points ?? 0,
    isAdmin: profile?.isAdmin === true || profile?.isAdmin === 'true' || profile?.isAdmin === 1,
    needsProfile: !rawName,
  }
}

function isRealUser(loginState) {
  if (!loginState?.user?.uid) return false
  // loginType 为 null 时（缓存恢复场景）视为非匿名，让 loadProfile 来判断
  return loginState.loginType?.toUpperCase() !== 'ANONYMOUS'
}

async function loadProfile(uid) {
  try {
    const { data } = await db.collection('profiles').where({ uid }).limit(1).get()
    const profile = data?.[0]
    currentUser.value = buildFallbackUser(uid, profile || {})
  } catch {
    currentUser.value = buildFallbackUser(uid)
  }
}

async function ensureAnonymousSession() {
  try {
    await auth.signInAnonymously()
  } catch (e) {
    console.warn('[Auth] 匿名登录失败 —— 请在云开发控制台「登录授权」中开启「匿名登录」:', e?.message)
  }
}

// 监听登录状态变化
auth.onLoginStateChanged(async loginState => {
  if (!loginState || !loginState.user?.uid) { currentUser.value = null; return }
  if (loginState.loginType?.toUpperCase() === 'ANONYMOUS') return  // 明确匿名，跳过
  // loginType 为 null（缓存恢复）或真实类型，尝试加载 profile
  await loadProfile(loginState.user.uid)
})

// 启动时恢复 session
;(async () => {
  try {
    const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
    const loginState = await Promise.race([auth.getLoginState(), timeout])
    if (!loginState?.user?.uid) {
      // 完全没有 session 才触发匿名登录
      await ensureAnonymousSession()
    } else if (isRealUser(loginState)) {
      await loadProfile(loginState.user.uid)
    }
    // 有 anonymous session → 什么都不做
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
    currentUser.value = null
    try { await auth.signOut() } catch {}
    await ensureAnonymousSession()
  }

  const init = async () => {
    try {
      const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
      const loginState = await Promise.race([auth.getLoginState(), timeout])
      if (!loginState?.user?.uid) {
        await ensureAnonymousSession()
      } else if (isRealUser(loginState)) {
        await loadProfile(loginState.user.uid)
      }
    } catch {}
  }

  return { currentUser, checkUsername, requestPhoneCode, confirmCode, login, setupProfile, updateAvatar, changePassword, logout, init }
}
