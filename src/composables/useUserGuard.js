import { db } from '@/lib/tcb.js'

const profileStatusCache = new Map()
const profileStatusPromiseCache = new Map()

function normalizeStatus(value) {
  return String(value || '').trim() === 'disabled' ? 'disabled' : 'active'
}

export function invalidateUserStatusCache(userId) {
  if (!userId) {
    profileStatusCache.clear()
    profileStatusPromiseCache.clear()
    return
  }
  profileStatusCache.delete(userId)
  profileStatusPromiseCache.delete(userId)
}

export function useUserGuard() {
  const getUserStatus = async (userId, { force = false } = {}) => {
    if (!userId) return 'active'
    if (!force && profileStatusCache.has(userId)) return profileStatusCache.get(userId)
    if (!force && profileStatusPromiseCache.has(userId)) return profileStatusPromiseCache.get(userId)

    const loadPromise = (async () => {
      try {
        const { data } = await db.collection('profiles').where({ uid: userId }).limit(1).get()
        const status = normalizeStatus(data?.[0]?.status)
        profileStatusCache.set(userId, status)
        return status
      } catch {
        return profileStatusCache.get(userId) || 'active'
      } finally {
        profileStatusPromiseCache.delete(userId)
      }
    })()

    profileStatusPromiseCache.set(userId, loadPromise)
    return loadPromise
  }

  const ensureUserCanInteract = async (userId, actionLabel = '执行此操作') => {
    const status = await getUserStatus(userId, { force: true })
    if (status === 'disabled') {
      throw new Error(`当前账号已被禁用，暂时无法${actionLabel}`)
    }
    return true
  }

  return { getUserStatus, ensureUserCanInteract }
}
