import { ref } from 'vue'
import { db } from '@/lib/tcb.js'

const lsKey = (uid) => `fav_${uid}`
const favorites = ref(new Set())
let fetchedUserId = null
let fetchPromise = null

const saveLocal = (uid, set) => {
  try { localStorage.setItem(lsKey(uid), JSON.stringify([...set])) } catch {}
}
const loadLocal = (uid) => {
  try { return new Set(JSON.parse(localStorage.getItem(lsKey(uid)) || '[]')) } catch { return new Set() }
}

export function useFavorites() {
  const fetchFavorites = async (userId, { force = false } = {}) => {
    if (!userId) return
    if (!force && fetchedUserId === userId) return favorites.value
    if (fetchPromise && !force) return fetchPromise

    favorites.value = loadLocal(userId)

    fetchPromise = (async () => {
      try {
        const { data } = await db.collection('problem_favorites')
          .where({ user_id: userId })
          .limit(200)
          .get()
        const ids = data.map(r => r.problem_id)
        favorites.value = new Set(ids)
        saveLocal(userId, favorites.value)
        fetchedUserId = userId
        return favorites.value
      } catch (e) {
        console.warn('[favorites] fetch failed, using local cache:', e?.message)
        return favorites.value
      } finally {
        fetchPromise = null
      }
    })()

    return fetchPromise
  }

  const toggleFavorite = async (problemId, userId) => {
    if (!userId) throw new Error('请先登录')
    const isFav = favorites.value.has(problemId)
    // 乐观更新 + 本地缓存
    const next = new Set(favorites.value)
    isFav ? next.delete(problemId) : next.add(problemId)
    favorites.value = next
    saveLocal(userId, next)
    try {
      if (isFav) {
        const { data } = await db.collection('problem_favorites')
          .where({ user_id: userId, problem_id: problemId })
          .limit(1).get()
        if (data?.length) await db.collection('problem_favorites').doc(data[0]._id).remove()
      } else {
        await db.collection('problem_favorites').add({
          user_id: userId, problem_id: problemId, created_at: db.serverDate(),
        })
      }
    } catch (e) {
      console.warn('[favorites] write failed:', e?.message)
      // DB 写入失败时回滚 UI 和缓存
      const rollback = new Set(favorites.value)
      isFav ? rollback.add(problemId) : rollback.delete(problemId)
      favorites.value = rollback
      saveLocal(userId, rollback)
    }
  }

  const removeFavorites = async (problemIds, userId) => {
    if (!userId) return
    const ids = [...new Set((problemIds || []).filter(Boolean))]
    if (!ids.length) return

    const next = new Set(favorites.value)
    ids.forEach((id) => next.delete(id))
    favorites.value = next
    saveLocal(userId, next)

    try {
      await Promise.all(ids.map(async (problemId) => {
        const { data } = await db.collection('problem_favorites')
          .where({ user_id: userId, problem_id: problemId })
          .limit(1)
          .get()
        if (data?.length) {
          await db.collection('problem_favorites').doc(data[0]._id).remove()
        }
      }))
    } catch (e) {
      console.warn('[favorites] cleanup failed:', e?.message)
    }
  }

  return { favorites, fetchFavorites, toggleFavorite, removeFavorites }
}
