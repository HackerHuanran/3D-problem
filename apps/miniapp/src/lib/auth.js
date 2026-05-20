import { ref } from 'vue'
import { auth, db } from './cloudbase.js'

const currentUser = ref(null)

function formatCnPhone(phone) {
  const raw = String(phone || '').trim()
  if (!raw) return ''
  if (/^\+\d{1,3}\s+\d{4,20}$/.test(raw)) return raw
  if (/^\+\d{5,}$/.test(raw)) return raw.replace(/^(\+\d{1,3})(\d+)$/, '$1 $2')
  return `+86 ${raw}`
}

function buildUser(uid, profile = {}) {
  const rawName = String(profile?.username || '').trim()
  const username = rawName || `用户${String(uid || '').slice(-4).toUpperCase()}`
  return {
    id: uid,
    username,
    avatar: profile?.avatar || username[0] || '?',
    phone: profile?.phone || '',
    points: profile?.points ?? 0,
  }
}

async function findProfile(uid) {
  try {
    const { data } = await db.collection('profiles').where({ uid }).limit(1).get()
    return data?.[0] || null
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
  currentUser.value = buildUser(uid, profile)
  return currentUser.value
}

export async function initMiniappAuth() {
  try {
    const loginState = await auth.getLoginState()
    if (loginState?.user?.uid && loginState?.loginType?.toUpperCase?.() !== 'ANONYMOUS') {
      await loadProfile(loginState.user.uid)
    } else {
      currentUser.value = null
    }
  } catch {
    currentUser.value = null
  }
  return currentUser.value
}

export async function miniappLogin(phone, password) {
  await auth.signInWithPhoneCodeOrPassword({ phoneNumber: phone, password })
  const loginState = await auth.getLoginState()
  if (!loginState?.user?.uid) throw new Error('登录失败，请重试')
  await loadProfile(loginState.user.uid)
  return currentUser.value
}

export async function miniappLogout() {
  currentUser.value = null
  try {
    await auth.signOut()
  } catch {}
}

export async function requestMiniappPasswordReset(phone) {
  const formattedPhone = formatCnPhone(phone)
  const verification = await auth.getVerification({ phone_number: formattedPhone })
  if (!verification?.verification_id) throw new Error('验证码发送失败，请重试')
  return {
    formattedPhone,
    verificationId: verification.verification_id,
  }
}

export async function confirmMiniappPasswordReset(context, code, password) {
  const verifyRes = await auth.verify({
    verification_id: context.verificationId,
    verification_code: code,
  })

  await auth.resetPassword({
    phone_number: context.formattedPhone,
    new_password: password,
    verification_token: verifyRes.verification_token,
  })

  await auth.signInWithPassword({ phone: context.formattedPhone, password })
  const loginState = await auth.getLoginState()
  if (loginState?.user?.uid) await loadProfile(loginState.user.uid)
  return currentUser.value
}

export { currentUser }
