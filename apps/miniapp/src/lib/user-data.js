import { ref } from 'vue'
import { db } from './cloudbase.js'

export const favoriteIds = ref([])
export const recentHistory = ref([])

export async function fetchMiniappFavorites(userId) {
  if (!userId) {
    favoriteIds.value = []
    return []
  }
  const { data } = await db.collection('problem_favorites')
    .where({ user_id: userId })
    .limit(200)
    .get()

  favoriteIds.value = (data || []).map((item) => item.problem_id).filter(Boolean)
  return favoriteIds.value
}

export async function toggleMiniappFavorite(problemId, userId) {
  if (!userId) throw new Error('请先登录')
  const current = new Set(favoriteIds.value)
  const has = current.has(problemId)

  if (has) {
    const { data } = await db.collection('problem_favorites')
      .where({ user_id: userId, problem_id: problemId })
      .limit(1)
      .get()
    if (data?.length) await db.collection('problem_favorites').doc(data[0]._id).remove()
    current.delete(problemId)
  } else {
    await db.collection('problem_favorites').add({
      user_id: userId,
      problem_id: problemId,
      created_at: db.serverDate(),
    })
    current.add(problemId)
  }

  favoriteIds.value = [...current]
  return !has
}

export async function recordMiniappHistory(problemId, userId = '') {
  if (!problemId) return null

  const localItem = {
    problemId,
    viewedAt: Date.now(),
  }

  recentHistory.value = [localItem, ...recentHistory.value.filter((item) => item.problemId !== problemId)].slice(0, 30)

  if (!userId) return localItem

  const { data } = await db.collection('problem_history')
    .where({ user_id: userId, problem_id: problemId })
    .limit(1)
    .get()

  if (data?.length) {
    await db.collection('problem_history').doc(data[0]._id).update({
      viewed_at: db.serverDate(),
    })
  } else {
    await db.collection('problem_history').add({
      user_id: userId,
      problem_id: problemId,
      viewed_at: db.serverDate(),
    })
  }

  return localItem
}

export async function fetchMiniappHistory(userId) {
  if (!userId) return recentHistory.value

  const { data } = await db.collection('problem_history')
    .where({ user_id: userId })
    .orderBy('viewed_at', 'desc')
    .limit(30)
    .get()

  recentHistory.value = (data || []).map((item) => ({
    problemId: item.problem_id,
    viewedAt: item.viewed_at || item.created_at || Date.now(),
  }))

  return recentHistory.value
}
