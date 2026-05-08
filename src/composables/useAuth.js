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

auth.onLoginStateChanged(async loginState => {
  if (loginState?.user?.uid) {
    await loadProfile(loginState.user.uid)
  } else {
    currentUser.value = null
  }
});

(async () => {
  try {
    const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
    const loginState = await Promise.race([auth.getLoginState(), timeout])
    if (loginState?.user?.uid) await loadProfile(loginState.user.uid)
  } catch {}
})()

export function useAuth() {

  // Check username uniqueness against profiles
  const checkUsername = async (username) => {
    // Done while user is registering (phone/password not yet submitted)
    // At this point there may be no auth state, so wrap in try/catch
    try {
      const { data: existing } = await db.collection('profiles')
        .where({ username }).limit(1).get()
      if (existing?.length > 0) throw new Error('用户名已被占用')
    } catch (e) {
      if (e.message === '用户名已被占用') throw e
      // DB query failed (no auth state) — skip the check and allow registration to proceed
      console.warn('username uniqueness check skipped:', e.message)
    }
  }

  // Registration step 1: send SMS, returns verifyOtp closure
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

  // Registration step 2: verify SMS code, set auth username, create profile
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

    // Set username in CloudBase auth system so it can be used for login
    try {
      const { data } = await auth.getUser()
      if (data?.user) await data.user.updateUsername(username)
    } catch (e) {
      console.warn('updateUsername failed:', e.message)
    }

    // Write profile document (set overwrites or creates)
    await db.collection('profiles').doc(uid).set({
      uid, username, avatar: username[0].toUpperCase(), phone, points: 0,
    })

    await loadProfile(uid)
  }

  // Login with phone + password — no OTP, no DB query
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

  // Set or update username for logged-in user (used when profile is missing)
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
    await loadProfile(uid)
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
  }

  const init = async () => {
    try {
      const timeout    = new Promise(resolve => setTimeout(resolve, 5000))
      const loginState = await Promise.race([auth.getLoginState(), timeout])
      if (loginState?.user?.uid) await loadProfile(loginState.user.uid)
    } catch {}
  }

  return { currentUser, checkUsername, requestPhoneCode, confirmCode, login, setupProfile, changePassword, logout, init }
}
