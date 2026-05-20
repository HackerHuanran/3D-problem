const db = wx.cloud.database()
const { getProblemDetail } = require('./problem-service')
const CURRENT_USER_KEY = 'current_user_profile'

function saveCurrentUser(user) {
  if (!user) return
  try {
    wx.setStorageSync(CURRENT_USER_KEY, user)
  } catch (error) {
    console.warn('saveCurrentUser failed', error)
  }
}

function loadCurrentUserCache() {
  try {
    return wx.getStorageSync(CURRENT_USER_KEY) || null
  } catch (error) {
    return null
  }
}

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
    saveCurrentUser(user)
    return user
  } catch (error) {
    console.error('miniappAuth failed', error)
    getApp().globalData.currentUser = null
    throw error
  }
}

async function getCurrentUser() {
  const current = getApp().globalData.currentUser || loadCurrentUserCache()
  if (current && !getApp().globalData.currentUser) {
    getApp().globalData.currentUser = current
  }
  return current || null
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
    .limit(10)
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
    if (String(error?.errMsg || error?.message || '').includes('DATABASE_COLLECTION_NOT_EXIST')) {
      return []
    }
    if (error?.errCode === -502005) {
      return []
    }
    console.warn('fetchMyProblemSubmissions failed', error)
    return []
  }
}

function logoutCurrentUser() {
  getApp().globalData.currentUser = null
  try {
    wx.removeStorageSync(CURRENT_USER_KEY)
  } catch (error) {
    console.warn('logoutCurrentUser failed', error)
  }
}

module.exports = {
  ensureUser,
  getCurrentUser,
  logoutCurrentUser,
  saveCurrentUser,
  loadCurrentUserCache,
  fetchFavorites,
  fetchFavoriteProblems,
  fetchHistoryProblems,
  toggleFavorite,
  recordHistory,
  fetchHistory,
  fetchMyProblemSubmissions,
}
