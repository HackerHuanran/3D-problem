import { app, db } from '@/lib/tcb.js'

const realnameStatusCache = new Map()
const realnamePromiseCache = new Map()

function normalizeRealnameStatus(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'verified') return 'verified'
  if (raw === 'pending') return 'pending'
  if (raw === 'rejected') return 'rejected'
  return 'unverified'
}

function maskRealname(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= 1) return text
  if (text.length === 2) return `${text[0]}*`
  return `${text[0]}${'*'.repeat(Math.max(1, text.length - 2))}${text[text.length - 1]}`
}

function maskIdNumber(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= 8) return text
  return `${text.slice(0, 3)}********${text.slice(-4)}`
}

export function invalidateRealnameCache(userId) {
  if (!userId) {
    realnameStatusCache.clear()
    realnamePromiseCache.clear()
    return
  }
  realnameStatusCache.delete(userId)
  realnamePromiseCache.delete(userId)
}

export function useRealname() {
  const getRealnameProfile = async (userId, { force = false } = {}) => {
    if (!userId) {
      return {
        status: 'unverified',
        realnameVerified: false,
        verifiedAt: null,
        rejectedReason: '',
        maskedName: '',
        maskedIdNumber: '',
      }
    }

    if (!force && realnameStatusCache.has(userId)) return realnameStatusCache.get(userId)
    if (!force && realnamePromiseCache.has(userId)) return realnamePromiseCache.get(userId)

    const loadPromise = (async () => {
      try {
        const { data } = await db.collection('profiles').where({ uid: userId }).limit(1).get()
        const profile = data?.[0] || {}
        const result = {
          status: normalizeRealnameStatus(profile.realname_status),
          realnameVerified: normalizeRealnameStatus(profile.realname_status) === 'verified',
          verifiedAt: profile.realname_verified_at || null,
          rejectedReason: String(profile.realname_rejected_reason || '').trim(),
          maskedName: String(profile.realname_masked_name || '').trim(),
          maskedIdNumber: String(profile.realname_masked_id || '').trim(),
        }
        realnameStatusCache.set(userId, result)
        return result
      } catch {
        return realnameStatusCache.get(userId) || {
          status: 'unverified',
          realnameVerified: false,
          verifiedAt: null,
          rejectedReason: '',
          maskedName: '',
          maskedIdNumber: '',
        }
      } finally {
        realnamePromiseCache.delete(userId)
      }
    })()

    realnamePromiseCache.set(userId, loadPromise)
    return loadPromise
  }

  const submitRealnameRequest = async (user, payload) => {
    if (!user?.id) throw new Error('请先登录')

    const realname = String(payload?.realname || '').trim()
    const idNumber = String(payload?.idNumber || '').trim().toUpperCase()
    const phone = String(payload?.phone || user.phone || '').trim()

    if (!realname) throw new Error('请填写真实姓名')
    if (!/^[\u4e00-\u9fa5·]{2,20}$/.test(realname)) throw new Error('请输入正确的真实姓名')
    if (!/^\d{17}[\dX]$/.test(idNumber)) throw new Error('请输入正确的18位身份证号')
    if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error('请输入正确的手机号')

    const res = await app.callFunction({
      name: 'realnameVerify',
      data: {
        userId: user.id,
        realname,
        idNumber,
        phone,
      },
    })

    const result = res?.result || {}
    if (!result.ok) {
      throw new Error(result.error || result.message || '实名认证失败，请稍后重试')
    }

    invalidateRealnameCache(user.id)
    return {
      status: result.status || 'verified',
      maskedName: result.maskedName || maskRealname(realname),
      maskedIdNumber: result.maskedIdNumber || maskIdNumber(idNumber),
      verified: result.verified === true,
    }
  }

  return {
    getRealnameProfile,
    submitRealnameRequest,
    invalidateRealnameCache,
  }
}
