import { db, cmd } from '@/lib/tcb.js'

const commentsCache = new Map()
const commentsPromiseCache = new Map()
const solutionsCache = new Map()
const solutionsPromiseCache = new Map()
const encounterCache = new Map()
const encounterCountsCache = new Map()
const problemCommunityCache = new Map()
const problemCommunityPromiseCache = new Map()

function normalizeCreatedAt(value) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function invalidateProblemCommunity(problemId) {
  if (!problemId) return
  commentsCache.delete(problemId)
  commentsPromiseCache.delete(problemId)
  solutionsCache.delete(problemId)
  solutionsPromiseCache.delete(problemId)
  problemCommunityCache.delete(problemId)
  problemCommunityPromiseCache.delete(problemId)
  encounterCache.delete(`${problemId}:guest`)
}

export function useCommunity() {
  const getProblemCommunity = async (problemId, userId, { force = false } = {}) => {
    if (!force && problemCommunityCache.has(problemId)) {
      const cached = problemCommunityCache.get(problemId)
      return {
        comments: cached.comments,
        solutions: cached.solutions,
        encounter: {
          count: cached.encounterCount,
          hasEncountered: userId ? cached.encounteredUsers.has(userId) : false,
        },
      }
    }
    if (!force && problemCommunityPromiseCache.has(problemId)) {
      const pending = await problemCommunityPromiseCache.get(problemId)
      return {
        comments: pending.comments,
        solutions: pending.solutions,
        encounter: {
          count: pending.encounterCount,
          hasEncountered: userId ? pending.encounteredUsers.has(userId) : false,
        },
      }
    }

    const loadPromise = (async () => {
      try {
        const [commentRes, solutionRes, encounterCountRes, userEncounterRes] = await Promise.all([
          db.collection('comments').where({ problem_id: problemId }).orderBy('created_at', 'desc').limit(100).get(),
          db.collection('solutions').where({ problem_id: problemId }).orderBy('created_at', 'desc').limit(100).get(),
          db.collection('encounters').where({ problem_id: problemId }).count(),
          userId
            ? db.collection('encounters').where({ problem_id: problemId, user_id: userId }).limit(1).get()
            : Promise.resolve({ data: [] }),
        ])

        const comments = commentRes.data || []
        const solutions = solutionRes.data || []
        const userIds = [...new Set([
          ...comments.map(item => item.user_id),
          ...solutions.map(item => item.user_id),
        ].filter(Boolean))]
        const targetIds = [
          ...comments.map(item => item._id),
          ...solutions.map(item => item._id),
        ]

        const [profileRes, likesRes] = await Promise.all([
          userIds.length
            ? db.collection('profiles').where({ uid: cmd.in(userIds) }).limit(userIds.length).get()
            : Promise.resolve({ data: [] }),
          targetIds.length
            ? db.collection('likes').where({ target_id: cmd.in(targetIds) }).limit(500).get()
            : Promise.resolve({ data: [] }),
        ])

        const profileMap = {}
        ;(profileRes.data || []).forEach((profile) => {
          profileMap[profile.uid] = profile
        })

        const likesByTarget = {}
        ;(likesRes.data || []).forEach((like) => {
          if (!likesByTarget[like.target_id]) likesByTarget[like.target_id] = []
          likesByTarget[like.target_id].push(like.user_id)
        })

        const mappedComments = comments.map((item) => ({
          id: item._id,
          userId: item.user_id,
          username: profileMap[item.user_id]?.username || '匿名用户',
          avatar: profileMap[item.user_id]?.avatar || '?',
          content: item.content,
          createdAt: normalizeCreatedAt(item.created_at),
          likes: likesByTarget[item._id] || [],
        }))

        const mappedSolutions = solutions
          .map((item) => ({
            id: item._id,
            userId: item.user_id,
            username: profileMap[item.user_id]?.username || '匿名用户',
            avatar: profileMap[item.user_id]?.avatar || '?',
            title: item.title,
            detail: item.detail,
            createdAt: normalizeCreatedAt(item.created_at),
            likes: likesByTarget[item._id] || [],
          }))
          .sort((a, b) => b.likes.length - a.likes.length || b.createdAt - a.createdAt)

        const payload = {
          comments: mappedComments,
          solutions: mappedSolutions,
          encounterCount: encounterCountRes.total || 0,
          encounteredUsers: new Set((userEncounterRes.data || []).map(item => item.user_id).filter(Boolean)),
        }

        problemCommunityCache.set(problemId, payload)
        commentsCache.set(problemId, mappedComments)
        solutionsCache.set(problemId, mappedSolutions)
        encounterCache.set(`${problemId}:guest`, { count: payload.encounterCount, hasEncountered: false })
        if (userId) {
          encounterCache.set(`${problemId}:${userId}`, {
            count: payload.encounterCount,
            hasEncountered: payload.encounteredUsers.has(userId),
          })
        }
        return payload
      } catch (e) {
        console.error('getProblemCommunity:', e)
        return problemCommunityCache.get(problemId) || {
          comments: commentsCache.get(problemId) || [],
          solutions: solutionsCache.get(problemId) || [],
          encounterCount: encounterCache.get(`${problemId}:guest`)?.count || 0,
          encounteredUsers: new Set(),
        }
      } finally {
        problemCommunityPromiseCache.delete(problemId)
      }
    })()

    problemCommunityPromiseCache.set(problemId, loadPromise)
    const payload = await loadPromise
    return {
      comments: payload.comments,
      solutions: payload.solutions,
      encounter: {
        count: payload.encounterCount,
        hasEncountered: userId ? payload.encounteredUsers.has(userId) : false,
      },
    }
  }

  // ── 评论 ──
  const getComments = async (problemId, { force = false } = {}) => {
    if (!force && commentsCache.has(problemId)) return commentsCache.get(problemId)
    if (!force && commentsPromiseCache.has(problemId)) return commentsPromiseCache.get(problemId)

    const loadPromise = (async () => {
      try {
        const { data: comments } = await db.collection('comments')
          .where({ problem_id: problemId })
          .orderBy('created_at', 'desc')
          .limit(100)
          .get()

        if (!comments.length) {
          commentsCache.set(problemId, [])
          return []
        }

        const userIds    = [...new Set(comments.map(c => c.user_id).filter(Boolean))]
        const commentIds = comments.map(c => c._id)

        const [profileRes, likesRes] = await Promise.all([
          db.collection('profiles').where({ uid: cmd.in(userIds) }).limit(userIds.length).get(),
          db.collection('likes').where({ target_id: cmd.in(commentIds) }).limit(500).get(),
        ])

        const profileMap = {}
        profileRes.data.forEach(p => { profileMap[p.uid] = p })

        const likesByTarget = {}
        likesRes.data.forEach(l => {
          if (!likesByTarget[l.target_id]) likesByTarget[l.target_id] = []
          likesByTarget[l.target_id].push(l.user_id)
        })

        const rows = comments.map(c => ({
          id:        c._id,
          userId:    c.user_id,
          username:  profileMap[c.user_id]?.username || '匿名用户',
          avatar:    profileMap[c.user_id]?.avatar   || '?',
          content:   c.content,
          createdAt: normalizeCreatedAt(c.created_at),
          likes:     likesByTarget[c._id] || [],
        }))
        commentsCache.set(problemId, rows)
        return rows
      } catch (e) {
        console.error('getComments:', e)
        return commentsCache.get(problemId) || []
      } finally {
        commentsPromiseCache.delete(problemId)
      }
    })()

    commentsPromiseCache.set(problemId, loadPromise)
    return loadPromise
  }

  const addComment = async (problemId, userId, content) => {
    await db.collection('comments').add({
      problem_id: problemId,
      user_id:    userId,
      content,
      created_at: db.serverDate(),
    })
    invalidateProblemCommunity(problemId)
  }

  const deleteComment = async (commentId, problemId = null) => {
    await db.collection('comments').doc(commentId).remove()
    const { data: likes } = await db.collection('likes')
      .where({ target_id: commentId, target_type: 'comment' }).get()
    await Promise.all(likes.map(l => db.collection('likes').doc(l._id).remove()))
    invalidateProblemCommunity(problemId)
  }

  const toggleCommentLike = async (commentId, userId, problemId = null) => {
    const { data } = await db.collection('likes')
      .where({ target_id: commentId, user_id: userId }).limit(1).get()
    if (data.length > 0) {
      await db.collection('likes').doc(data[0]._id).remove()
    } else {
      await db.collection('likes').add({ target_id: commentId, user_id: userId, target_type: 'comment' })
    }
    invalidateProblemCommunity(problemId)
  }

  // ── 补充方案 ──
  const getSolutions = async (problemId, { force = false } = {}) => {
    if (!force && solutionsCache.has(problemId)) return solutionsCache.get(problemId)
    if (!force && solutionsPromiseCache.has(problemId)) return solutionsPromiseCache.get(problemId)

    const loadPromise = (async () => {
      try {
        const { data: solutions } = await db.collection('solutions')
          .where({ problem_id: problemId })
          .orderBy('created_at', 'desc')
          .limit(100)
          .get()

        if (!solutions.length) {
          solutionsCache.set(problemId, [])
          return []
        }

        const userIds     = [...new Set(solutions.map(s => s.user_id).filter(Boolean))]
        const solutionIds = solutions.map(s => s._id)

        const [profileRes, likesRes] = await Promise.all([
          db.collection('profiles').where({ uid: cmd.in(userIds) }).limit(userIds.length).get(),
          db.collection('likes').where({ target_id: cmd.in(solutionIds) }).limit(500).get(),
        ])

        const profileMap = {}
        profileRes.data.forEach(p => { profileMap[p.uid] = p })

        const likesByTarget = {}
        likesRes.data.forEach(l => {
          if (!likesByTarget[l.target_id]) likesByTarget[l.target_id] = []
          likesByTarget[l.target_id].push(l.user_id)
        })

        const rows = solutions
          .map(s => ({
            id:        s._id,
            userId:    s.user_id,
            username:  profileMap[s.user_id]?.username || '匿名用户',
            avatar:    profileMap[s.user_id]?.avatar   || '?',
            title:     s.title,
            detail:    s.detail,
            createdAt: normalizeCreatedAt(s.created_at),
            likes:     likesByTarget[s._id] || [],
          }))
          .sort((a, b) => b.likes.length - a.likes.length || b.createdAt - a.createdAt)

        solutionsCache.set(problemId, rows)
        return rows
      } catch (e) {
        console.error('getSolutions:', e)
        return solutionsCache.get(problemId) || []
      } finally {
        solutionsPromiseCache.delete(problemId)
      }
    })()

    solutionsPromiseCache.set(problemId, loadPromise)
    return loadPromise
  }

  const addSolution = async (problemId, userId, title, detail) => {
    await db.collection('solutions').add({
      problem_id: problemId,
      user_id:    userId,
      title,
      detail,
      created_at: db.serverDate(),
    })
    invalidateProblemCommunity(problemId)
  }

  const deleteSolution = async (solutionId, problemId = null) => {
    await db.collection('solutions').doc(solutionId).remove()
    const { data: likes } = await db.collection('likes')
      .where({ target_id: solutionId, target_type: 'solution' }).get()
    await Promise.all(likes.map(l => db.collection('likes').doc(l._id).remove()))
    invalidateProblemCommunity(problemId)
  }

  const toggleSolutionLike = async (solutionId, userId, problemId = null) => {
    const { data } = await db.collection('likes')
      .where({ target_id: solutionId, user_id: userId }).limit(1).get()
    if (data.length > 0) {
      await db.collection('likes').doc(data[0]._id).remove()
    } else {
      await db.collection('likes').add({ target_id: solutionId, user_id: userId, target_type: 'solution' })
    }
    invalidateProblemCommunity(problemId)
  }

  // ── 我也遇到了 ──
  const getEncounterData = async (problemId, userId, { force = false } = {}) => {
    const cacheKey = `${problemId}:${userId || 'guest'}`
    if (!force && encounterCache.has(cacheKey)) return encounterCache.get(cacheKey)
    try {
      const [countRes, userRes] = await Promise.all([
        db.collection('encounters').where({ problem_id: problemId }).count(),
        userId
          ? db.collection('encounters').where({ problem_id: problemId, user_id: userId }).limit(1).get()
          : Promise.resolve({ data: [] }),
      ])
      const result = { count: countRes.total || 0, hasEncountered: (userRes.data?.length || 0) > 0 }
      encounterCache.set(cacheKey, result)
      return result
    } catch {
      return encounterCache.get(cacheKey) || { count: 0, hasEncountered: false }
    }
  }

  const toggleEncounter = async (problemId, userId) => {
    try {
      const { data } = await db.collection('encounters')
        .where({ problem_id: problemId, user_id: userId }).limit(1).get()
      if (data.length > 0) {
        await db.collection('encounters').doc(data[0]._id).remove()
        encounterCache.delete(`${problemId}:${userId}`)
        invalidateProblemCommunity(problemId)
        encounterCountsCache.clear()
        return false
      } else {
        await db.collection('encounters').add({ problem_id: problemId, user_id: userId, created_at: db.serverDate() })
        encounterCache.delete(`${problemId}:${userId}`)
        invalidateProblemCommunity(problemId)
        encounterCountsCache.clear()
        return true
      }
    } catch (e) {
      console.error('toggleEncounter:', e?.message)
      throw e
    }
  }

  // 批量获取多个问题的遇到人数（首页卡片用）
  const getEncounterCounts = async (problemIds, { force = false } = {}) => {
    const sortedIds = [...problemIds].sort()
    const cacheKey = JSON.stringify(sortedIds)
    if (!force && encounterCountsCache.has(cacheKey)) return encounterCountsCache.get(cacheKey)
    try {
      const { data } = await db.collection('encounters')
        .where({ problem_id: cmd.in(sortedIds) })
        .limit(2000).get()
      const counts = {}
      data.forEach(e => { counts[e.problem_id] = (counts[e.problem_id] || 0) + 1 })
      encounterCountsCache.set(cacheKey, counts)
      return counts
    } catch { return {} }
  }

  const getUserActivity = async (userId) => {
    try {
      const [commentRes, solutionRes, encounterRes] = await Promise.all([
        db.collection('comments').where({ user_id: userId }).orderBy('created_at', 'desc').limit(100).get(),
        db.collection('solutions').where({ user_id: userId }).orderBy('created_at', 'desc').limit(100).get(),
        db.collection('encounters').where({ user_id: userId }).orderBy('created_at', 'desc').limit(100).get(),
      ])

      const comments = commentRes.data || []
      const solutions = solutionRes.data || []
      const encounters = encounterRes.data || []
      const solutionIds = solutions.map(item => item._id)
      const commentIds = comments.map(item => item._id)

      const likes = solutionIds.length || commentIds.length
        ? await db.collection('likes')
            .where({
              target_id: cmd.in([...solutionIds, ...commentIds]),
            })
            .limit(500)
            .get()
        : { data: [] }

      const likesByTarget = {}
      likes.data.forEach((item) => {
        likesByTarget[item.target_id] = (likesByTarget[item.target_id] || 0) + 1
      })

      return {
        comments: comments.map((item) => ({
          id: item._id,
          problemId: item.problem_id,
          content: item.content,
          createdAt: normalizeCreatedAt(item.created_at),
          likes: likesByTarget[item._id] || 0,
        })),
        solutions: solutions.map((item) => ({
          id: item._id,
          problemId: item.problem_id,
          title: item.title,
          detail: item.detail,
          createdAt: normalizeCreatedAt(item.created_at),
          likes: likesByTarget[item._id] || 0,
        })),
        encounters: encounters.map((item) => ({
          id: item._id,
          problemId: item.problem_id,
          createdAt: normalizeCreatedAt(item.created_at),
        })),
        stats: {
          commentCount: comments.length,
          solutionCount: solutions.length,
          encounterCount: encounters.length,
          receivedLikes: Object.values(likesByTarget).reduce((sum, count) => sum + count, 0),
        },
      }
    } catch (e) {
      console.error('getUserActivity:', e)
      return {
        comments: [],
        solutions: [],
        encounters: [],
        stats: { commentCount: 0, solutionCount: 0, encounterCount: 0, receivedLikes: 0 },
      }
    }
  }

  return {
    getProblemCommunity,
    getComments, addComment, deleteComment, toggleCommentLike,
    getSolutions, addSolution, deleteSolution, toggleSolutionLike,
    getEncounterData, toggleEncounter, getEncounterCounts, getUserActivity,
  }
}
