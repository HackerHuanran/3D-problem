import { ref } from 'vue'
import { db, cmd } from '@/lib/tcb.js'

const solutionCache = new Map()
const solutionPromiseCache = new Map()

function toTime(value) {
  if (!value) return 0
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function cacheKey(problemId, currentUserId = '') {
  return `${problemId}::${currentUserId || 'guest'}`
}

function invalidateProblemSolutionCache(problemId) {
  if (!problemId) return
  const prefix = `${problemId}::`
  ;[...solutionCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) solutionCache.delete(key)
  })
  ;[...solutionPromiseCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) solutionPromiseCache.delete(key)
  })
}

function normalizeLikeRows(rows = []) {
  const uniqueMap = new Map()

  ;(rows || []).forEach((row) => {
    const targetId = row?.target_id
    const userId = row?.user_id
    if (!targetId || !userId) return
    const key = `${targetId}::${userId}`
    const prev = uniqueMap.get(key)
    const prevTime = toTime(prev?.updated_at || prev?.created_at)
    const nextTime = toTime(row?.updated_at || row?.created_at)
    if (!prev || nextTime >= prevTime) uniqueMap.set(key, row)
  })

  return [...uniqueMap.values()]
}

function buildLikeMap(rows = []) {
  const map = new Map()

  normalizeLikeRows(rows).forEach((row) => {
    const targetId = row?.target_id
    if (!targetId) return
    if (!map.has(targetId)) map.set(targetId, [])
    map.get(targetId).push(row.user_id)
  })

  return map
}

function mapSolution(doc, likes = [], currentUserId = '') {
  return {
    id: doc._id,
    problemId: doc.parent_problem_id || '',
    problemTitle: doc.parent_problem_title || '',
    title: doc.title || '',
    subtitle: doc.subtitle || '',
    description: doc.description || '',
    category: doc.category || '未分类',
    difficulty: doc.difficulty || '常见',
    image_url: doc.image_url || null,
    causes: doc.causes || [],
    solutions: (doc.solutions || []).map((item, index) => ({
      step: item.step || index + 1,
      title: item.title || '',
      detail: item.detail || '',
      image_url: item.image_url || null,
    })),
    tips: doc.tips || '',
    username: doc.username || '匿名用户',
    userId: doc.user_id || '',
    createdAt: toTime(doc.created_at),
    updatedAt: toTime(doc.updated_at || doc.created_at),
    status: doc.status || 'pending',
    likes,
    likeCount: likes.length,
    likedByCurrentUser: !!(currentUserId && likes.includes(currentUserId)),
  }
}

function sortSolutions(list = []) {
  return [...list].sort((a, b) => {
    if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount
    return b.createdAt - a.createdAt
  })
}

export function useProblemSolutions() {
  const loading = ref(false)

  const getProblemSolutions = async (problemId, currentUserId = '', { force = false } = {}) => {
    if (!problemId) return []

    const key = cacheKey(problemId, currentUserId)
    if (!force && solutionCache.has(key)) return solutionCache.get(key)
    if (!force && solutionPromiseCache.has(key)) return solutionPromiseCache.get(key)

    loading.value = true
    const loadPromise = (async () => {
      try {
        const { data } = await db.collection('user_problems')
          .where({
            submission_type: 'solution',
            parent_problem_id: problemId,
            status: 'published',
          })
          .orderBy('created_at', 'desc')
          .limit(200)
          .get()

        const rows = data || []
        const solutionIds = rows.map((item) => item._id).filter(Boolean)
        const likesRes = solutionIds.length
          ? await db.collection('likes')
              .where({
                target_id: cmd.in(solutionIds),
                target_type: 'problem_solution_submission',
              })
              .limit(1000)
              .get()
          : { data: [] }

        const likeMap = buildLikeMap(likesRes.data || [])
        const mapped = sortSolutions(
          rows.map((item) => mapSolution(item, likeMap.get(item._id) || [], currentUserId)),
        )

        solutionCache.set(key, mapped)
        return mapped
      } finally {
        loading.value = false
      }
    })()

    solutionPromiseCache.set(key, loadPromise)
    try {
      return await loadPromise
    } finally {
      solutionPromiseCache.delete(key)
    }
  }

  const toggleProblemSolutionLike = async (solution, userId) => {
    if (!solution?.id || !solution?.problemId || !userId) {
      throw new Error('缺少点赞对象或用户信息')
    }

    const { data } = await db.collection('likes')
      .where({
        target_id: solution.id,
        user_id: userId,
        target_type: 'problem_solution_submission',
      })
      .limit(20)
      .get()

    const rows = data || []
    const latest = [...rows].sort((a, b) => toTime(b.updated_at || b.created_at) - toTime(a.updated_at || a.created_at))[0] || null
    const duplicateRows = rows.filter((row) => row?._id && row._id !== latest?._id)

    if (duplicateRows.length) {
      await Promise.all(duplicateRows.map((row) => db.collection('likes').doc(row._id).remove()))
    }

    let liked = false
    if (latest?._id) {
      await db.collection('likes').doc(latest._id).remove()
      liked = false
    } else {
      await db.collection('likes').add({
        target_id: solution.id,
        user_id: userId,
        target_type: 'problem_solution_submission',
        problem_id: solution.problemId,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      })
      liked = true
    }

    invalidateProblemSolutionCache(solution.problemId)
    const rowsAfterToggle = await getProblemSolutions(solution.problemId, userId, { force: true })
    const nextRow = rowsAfterToggle.find((item) => item.id === solution.id)

    return nextRow || {
      ...solution,
      likes: liked ? [userId] : [],
      likeCount: liked ? 1 : 0,
      likedByCurrentUser: liked,
    }
  }

  return {
    loading,
    getProblemSolutions,
    toggleProblemSolutionLike,
    invalidateProblemSolutionCache,
  }
}
