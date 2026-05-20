const db = wx.cloud.database()
const { getProblemDetail } = require('./problem-service')
const MISSING_COLLECTION_CODE = -502005

async function ensureUser(profile = null) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'miniappAuth',
      data: {
        profile,
      },
    })
    if (res?.result?.ok === false) {
      throw new Error(res?.result?.error || '微信登录失败')
    }
    const user = res?.result?.user || null
    if (user) {
      user.profileSynced = res?.result?.profileSynced !== false
    }
    getApp().globalData.currentUser = user
    return user
  } catch (error) {
    console.error('miniappAuth failed', error)
    getApp().globalData.currentUser = null
    throw error
  }
}

async function getCurrentUser() {
  return getApp().globalData.currentUser || null
}

async function fetchFavorites(userId) {
  if (!userId) return []
  const { data } = await db.collection('problem_favorites')
    .where({ user_id: userId })
    .limit(200)
    .get()
  return (data || []).map((item) => item.problem_id).filter(Boolean)
}

async function toggleFavorite(userId, problemId) {
  if (!userId || !problemId) return false
  const { data } = await db.collection('problem_favorites')
    .where({ user_id: userId, problem_id: problemId })
    .limit(1)
    .get()

  if (data && data.length) {
    await db.collection('problem_favorites').doc(data[0]._id).remove()
    return false
  }

  await db.collection('problem_favorites').add({
    data: {
      user_id: userId,
      problem_id: problemId,
      created_at: db.serverDate(),
    },
  })
  return true
}

async function recordHistory(userId, problemId) {
  if (!userId || !problemId) return
  const { data } = await db.collection('problem_history')
    .where({ user_id: userId, problem_id: problemId })
    .limit(1)
    .get()

  if (data && data.length) {
    await db.collection('problem_history').doc(data[0]._id).update({
      data: { viewed_at: db.serverDate() },
    })
    return
  }

  await db.collection('problem_history').add({
    data: {
      user_id: userId,
      problem_id: problemId,
      viewed_at: db.serverDate(),
    },
  })
}

async function fetchHistory(userId) {
  if (!userId) return []
  const { data } = await db.collection('problem_history')
    .where({ user_id: userId })
    .orderBy('viewed_at', 'desc')
    .limit(20)
    .get()

  return data || []
}

async function fetchFavoriteProblems(userId) {
  try {
    const favoriteIds = await fetchFavorites(userId)
    const rows = await Promise.all(favoriteIds.map((id) => getProblemDetail(id)))
    return rows.filter(Boolean)
  } catch (error) {
    console.warn('fetchFavoriteProblems failed', error)
    return []
  }
}

async function fetchHistoryProblems(userId) {
  try {
    const historyRows = await fetchHistory(userId)
    const problemIds = historyRows.map((item) => item.problem_id).filter(Boolean)
    const rows = await Promise.all(problemIds.map((id) => getProblemDetail(id)))
    return rows.filter(Boolean)
  } catch (error) {
    console.warn('fetchHistoryProblems failed', error)
    return []
  }
}

async function fetchMyProblemSubmissions(userId) {
  if (!userId) return []
  try {
    const { data } = await db.collection('user_problems')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    return (data || []).map((item) => ({
      id: item._id,
      problemId: item.problem_id || '',
      title: item.title || '',
      subtitle: item.subtitle || '',
      category: item.category || '未分类',
      status: item.status || 'pending',
      submissionType: item.submission_type || 'problem',
      createdAt: item.created_at || null,
      parentProblemTitle: item.parent_problem_title || '',
    }))
  } catch (error) {
    console.warn('fetchMyProblemSubmissions failed', error)
    return []
  }
}

async function fetchMyMarketPosts(userId) {
  if (!userId) return []
  try {
    const { data } = await db.collection('market_posts')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    return (data || []).map((item) => ({
      id: item._id,
      title: item.title || '',
      description: item.description || '',
      category: item.category || '未分类',
      status: item.status || '待解决',
      budget: item.budget || '',
      createdAt: item.created_at || null,
    }))
  } catch (error) {
    if (error?.errCode === MISSING_COLLECTION_CODE) {
      return { list: [], missingCollection: 'market_posts' }
    }
    console.warn('fetchMyMarketPosts failed', error)
    return { list: [], error: error?.message || '加载我的需求失败' }
  }
}

function logoutCurrentUser() {
  getApp().globalData.currentUser = null
}

module.exports = {
  ensureUser,
  getCurrentUser,
  logoutCurrentUser,
  fetchFavorites,
  fetchFavoriteProblems,
  fetchHistoryProblems,
  toggleFavorite,
  recordHistory,
  fetchHistory,
  fetchMyProblemSubmissions,
  fetchMyMarketPosts,
}
