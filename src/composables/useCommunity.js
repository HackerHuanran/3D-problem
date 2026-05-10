import { db, cmd } from '@/lib/tcb.js'

export function useCommunity() {

  // ── 评论 ──
  const getComments = async (problemId) => {
    try {
      const { data: comments } = await db.collection('comments')
        .where({ problem_id: problemId })
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()

      if (!comments.length) return []

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

      return comments.map(c => ({
        id:        c._id,
        userId:    c.user_id,
        username:  profileMap[c.user_id]?.username || '匿名用户',
        avatar:    profileMap[c.user_id]?.avatar   || '?',
        content:   c.content,
        createdAt: c.created_at instanceof Date ? c.created_at.getTime() : new Date(c.created_at).getTime(),
        likes:     likesByTarget[c._id] || [],
      }))
    } catch (e) {
      console.error('getComments:', e)
      return []
    }
  }

  const addComment = async (problemId, userId, content) => {
    await db.collection('comments').add({
      problem_id: problemId,
      user_id:    userId,
      content,
      created_at: db.serverDate(),
    })
  }

  const deleteComment = async (commentId) => {
    await db.collection('comments').doc(commentId).remove()
    const { data: likes } = await db.collection('likes')
      .where({ target_id: commentId, target_type: 'comment' }).get()
    await Promise.all(likes.map(l => db.collection('likes').doc(l._id).remove()))
  }

  const toggleCommentLike = async (commentId, userId) => {
    const { data } = await db.collection('likes')
      .where({ target_id: commentId, user_id: userId }).limit(1).get()
    if (data.length > 0) {
      await db.collection('likes').doc(data[0]._id).remove()
    } else {
      await db.collection('likes').add({ target_id: commentId, user_id: userId, target_type: 'comment' })
    }
  }

  // ── 补充方案 ──
  const getSolutions = async (problemId) => {
    try {
      const { data: solutions } = await db.collection('solutions')
        .where({ problem_id: problemId })
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()

      if (!solutions.length) return []

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

      return solutions
        .map(s => ({
          id:        s._id,
          userId:    s.user_id,
          username:  profileMap[s.user_id]?.username || '匿名用户',
          avatar:    profileMap[s.user_id]?.avatar   || '?',
          title:     s.title,
          detail:    s.detail,
          createdAt: s.created_at instanceof Date ? s.created_at.getTime() : new Date(s.created_at).getTime(),
          likes:     likesByTarget[s._id] || [],
        }))
        .sort((a, b) => b.likes.length - a.likes.length || b.createdAt - a.createdAt)
    } catch (e) {
      console.error('getSolutions:', e)
      return []
    }
  }

  const addSolution = async (problemId, userId, title, detail) => {
    await db.collection('solutions').add({
      problem_id: problemId,
      user_id:    userId,
      title,
      detail,
      created_at: db.serverDate(),
    })
  }

  const deleteSolution = async (solutionId) => {
    await db.collection('solutions').doc(solutionId).remove()
    const { data: likes } = await db.collection('likes')
      .where({ target_id: solutionId, target_type: 'solution' }).get()
    await Promise.all(likes.map(l => db.collection('likes').doc(l._id).remove()))
  }

  const toggleSolutionLike = async (solutionId, userId) => {
    const { data } = await db.collection('likes')
      .where({ target_id: solutionId, user_id: userId }).limit(1).get()
    if (data.length > 0) {
      await db.collection('likes').doc(data[0]._id).remove()
    } else {
      await db.collection('likes').add({ target_id: solutionId, user_id: userId, target_type: 'solution' })
    }
  }

  // ── 我也遇到了 ──
  const getEncounterData = async (problemId, userId) => {
    try {
      const [countRes, userRes] = await Promise.all([
        db.collection('encounters').where({ problem_id: problemId }).count(),
        userId
          ? db.collection('encounters').where({ problem_id: problemId, user_id: userId }).limit(1).get()
          : Promise.resolve({ data: [] }),
      ])
      return { count: countRes.total || 0, hasEncountered: (userRes.data?.length || 0) > 0 }
    } catch { return { count: 0, hasEncountered: false } }
  }

  const toggleEncounter = async (problemId, userId) => {
    try {
      const { data } = await db.collection('encounters')
        .where({ problem_id: problemId, user_id: userId }).limit(1).get()
      if (data.length > 0) {
        await db.collection('encounters').doc(data[0]._id).remove()
        return false
      } else {
        await db.collection('encounters').add({ problem_id: problemId, user_id: userId, created_at: db.serverDate() })
        return true
      }
    } catch (e) {
      console.error('toggleEncounter:', e?.message)
      throw e
    }
  }

  // 批量获取多个问题的遇到人数（首页卡片用）
  const getEncounterCounts = async (problemIds) => {
    try {
      const { data } = await db.collection('encounters')
        .where({ problem_id: cmd.in(problemIds) })
        .limit(2000).get()
      const counts = {}
      data.forEach(e => { counts[e.problem_id] = (counts[e.problem_id] || 0) + 1 })
      return counts
    } catch { return {} }
  }

  return {
    getComments, addComment, deleteComment, toggleCommentLike,
    getSolutions, addSolution, deleteSolution, toggleSolutionLike,
    getEncounterData, toggleEncounter, getEncounterCounts,
  }
}
