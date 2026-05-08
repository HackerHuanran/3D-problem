import { ref } from 'vue'
import { auth, db } from '@/lib/tcb.js'

const currentUser = ref(null)

async function loadProfile(uid) {
  try {
    const { data } = await db.collection('profiles').doc(uid).get()
    if (data) {
      currentUser.value = {
        id:       uid,
        username: data.username || uid.slice(0, 8),
        avatar:   data.avatar   || '?',
        phone:    data.phone    || '',
        points:   data.points   ?? 0,
      }
    } else {
      currentUser.value = { id: uid, username: uid.slice(0, 8), avatar: '?', phone: '', points: 0 }
    }
  } catch {
    currentUser.value = { id: uid, username: uid.slice(0, 8), avatar: '?', phone: '', points: 0 }
  }
}

// Only update currentUser for real (non-anonymous) logins
auth.onLoginStateChanged(async loginState => {
  if (!loginState) {
    currentUser.value = null
    return
  }
  // Anonymous sessions are used only to enable DB reads — don't show as logged-in user
  if (loginState.loginType === 'ANONYMOUS') return
  if (loginState?.user?.uid) await loadProfile(loginState.user.uid)
});

// On startup: restore session or init anonymous session for DB reads
(async () => {
  try {
    const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
    const loginState = await Promise.race([auth.getLoginState(), timeout])
    if (loginState?.user?.uid && loginState?.loginType !== 'ANONYMOUS') {
      await loadProfile(loginState.user.uid)
    } else if (!loginState) {
      // No session — sign in anonymously so DB reads work for all users
      try { await auth.signInAnonymously() } catch {}
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

  // Registration step 1: send SMS
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

  // Registration step 2: verify SMS code, write profile, update UI directly
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

    // Update UI directly — don't re-read from DB (may return cached old value)
    currentUser.value = { id: uid, username, avatar: username[0].toUpperCase(), phone, points: 0 }
  }

  // Login with phone + password — no OTP needed
  const login = async (phone, password) => {
    try {
      await auth.signInWithPhoneCodeOrPassword({ phoneNumber: phone, password })
    } catch (e) {
      const msg = e?.error_description || e?.message || '手机号或密码错误'
      throw new Error(msg)
    }
    const loginState = await auth.getLoginState()
    if (loginState?.user?.uid) await loadProfile(loginState.user.uid)
  }

  // Set or update username for logged-in user
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
      const { data: profile } = await db.collection('profiles').doc(uid).get()
      if (profile) {
        await db.collection('profiles').doc(uid).update({
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
      const msg = e?.message || JSON.stringify(e)
      throw new Error('设置失败：' + msg)
    }

    // Update UI directly — don't rely on DB re-read
    currentUser.value = {
      ...currentUser.value,
      username: username.trim(),
      avatar:   username.trim()[0].toUpperCase(),
    }
  }

  // Change password for logged-in user
  const changePassword = async (oldPassword, newPassword) => {
    if (!newPassword || newPassword.length < 6) throw new Error('新密码至少6位')
    const { data, error } = await auth.getUser()
    if (error || !data?.user) throw new Error('获取用户信息失败')
    try {
      await data.user.updatePassword(newPassword, oldPassword)
    } catch (e) {
      const msg = e?.error_description || e?.message || JSON.stringify(e)
      throw new Error('修改失败：' + msg)
    }
  }

  const logout = async () => {
    currentUser.value = null
    try { await auth.signOut() } catch {}
    // Re-init anonymous session after logout so DB reads keep working
    try { await auth.signInAnonymously() } catch {}
  }

  const init = async () => {
    try {
      const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
      const loginState = await Promise.race([auth.getLoginState(), timeout])
      if (loginState?.user?.uid && loginState?.loginType !== 'ANONYMOUS') {
        await loadProfile(loginState.user.uid)
      }
    } catch {}
  }

  return { currentUser, checkUsername, requestPhoneCode, confirmCode, login, setupProfile, changePassword, logout, init }
}
