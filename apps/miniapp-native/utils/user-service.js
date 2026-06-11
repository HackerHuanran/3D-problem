const db = wx.cloud.database()
const { getProblemDetail } = require('./problem-service')
const MISSING_COLLECTION_CODE = -502005
const LOGIN_SESSION_KEY = 'miniappLoginSessionUserId'
const USER_DASHBOARD_CACHE_KEY = 'miniapp_user_dashboard_cache_v1'
const USER_DASHBOARD_CACHE_TTL = 2 * 60 * 1000

function readDashboardCache(userId = '') {
  if (!userId) return null
  try {
    const cache = wx.getStorageSync(USER_DASHBOARD_CACHE_KEY) || {}
    const entry = cache[userId]
    if (!entry?.ts || Date.now() - entry.ts > USER_DASHBOARD_CACHE_TTL) return null
    return entry.data || null
  } catch (error) {
    return null
  }
}

function writeDashboardCache(userId = '', data = null) {
  if (!userId || !data) return
  try {
    const cache = wx.getStorageSync(USER_DASHBOARD_CACHE_KEY) || {}
    cache[userId] = {
      ts: Date.now(),
      data,
    }
    wx.setStorageSync(USER_DASHBOARD_CACHE_KEY, cache)
  } catch (error) {
    console.warn('writeDashboardCache failed', error)
  }
}

function getRecordTime(record = {}) {
  const value = record?.updated_at || record?.created_at || record?.updatedAt || record?.createdAt || 0
  if (typeof value === 'number') return value
  if (value && typeof value.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function isGenericWechatName(name = '') {
  const text = String(name || '').trim()
  if (!text) return true
  if (text === '微信用户') return true
  return /^微信用户[0-9A-F]{0,8}$/i.test(text)
}

function isUsableAvatarUrl(value = '') {
  const text = String(value || '').trim()
  return /^(https?:\/\/|cloud:\/\/|wxfile:\/\/|http:\/\/tmp\/|\/|data:image\/)/i.test(text)
}

function getProfileScore(record = {}) {
  const source = String(record.source || '').toLowerCase()
  const username = record.username || record.nickName || record.nick_name || record.name || ''
  const avatarUrl = record.avatarUrl || record.avatar_url || ''
  let score = 0
  if (record.profileEdited === true || source.includes('profile_edit')) score += 1000
  if (!isGenericWechatName(username)) score += 100
  if (isUsableAvatarUrl(avatarUrl)) score += 20
  if (record.phone) score += 5
  if (record.gender && record.gender !== 'unknown') score += 3
  return score
}

function pickPreferredProfile(rows = []) {
  return [...rows].sort((a, b) => {
    const scoreDiff = getProfileScore(b) - getProfileScore(a)
    if (scoreDiff) return scoreDiff
    return getRecordTime(b) - getRecordTime(a)
  })[0] || null
}

function normalizeCauseList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((cause) => {
      if (typeof cause === 'string') return cause.trim()
      if (cause && typeof cause === 'object') {
        return String(cause.text || cause.detail || cause.title || '').trim()
      }
      return String(cause || '').trim()
    })
    .filter(Boolean)
}

function isDeletedSubmission(item = {}) {
  const status = String(item.status || '').trim().toLowerCase()
  return item.deleted === true || item.is_deleted === true || ['deleted', 'removed'].includes(status)
}

function normalizeUserRecord(record = null) {
  if (!record) return null
  const id = record.id || record.uid || record.user_id || ''
  const username = record.username || record.nickName || record.nick_name || record.name || ''
  const rawAvatarUrl = record.avatarUrl || record.avatar_url || ''
  const avatarUrl = isUsableAvatarUrl(rawAvatarUrl) ? rawAvatarUrl : ''
  return {
    ...record,
    id,
    username,
    avatarUrl,
    rawAvatarUrl: avatarUrl,
    avatar: record.avatar || (username ? String(username).slice(0, 1) : '微'),
  }
}

async function fetchProfileByUserId(userId) {
  if (!userId) return null
  const { data } = await db.collection('profiles')
    .where({ uid: userId })
    .limit(20)
    .get()
  const rows = Array.isArray(data) ? data : []
  const preferred = pickPreferredProfile(rows)
  if (preferred?._id && rows.length > 1) {
    for (const row of rows.filter((item) => item?._id && item._id !== preferred._id)) {
      await db.collection('profiles').doc(row._id).remove()
    }
  }
  return normalizeUserRecord(preferred)
}

function mergeUserWithProfile(user, profile) {
  const normalizedUser = normalizeUserRecord(user)
  const normalizedProfile = normalizeUserRecord(profile)
  if (!normalizedUser && !normalizedProfile) return null
  const id = normalizedUser?.id || normalizedProfile?.id || ''
  const username = normalizedProfile?.username || normalizedUser?.username || '微信用户'
  const avatarUrl = normalizedProfile?.avatarUrl || normalizedUser?.avatarUrl || ''
  const avatar = normalizedProfile?.avatar || normalizedUser?.avatar || (username ? String(username).slice(0, 1) : '微')
  return {
    ...(normalizedUser || {}),
    ...(normalizedProfile || {}),
    id,
    username,
    avatarUrl,
    avatar,
    avatarText: avatar,
    displayName: username,
  }
}

function getUserCacheKeys(userId = '') {
  const suffix = userId ? `:${String(userId).trim()}` : ''
  return {
    currentUserKey: `currentUser${suffix}`,
    currentUserDisplayKey: `currentUserDisplay${suffix}`,
    lastWechatProfileKey: `lastWechatProfile${suffix}`,
  }
}

function saveLoginSession(userId = '') {
  try {
    if (userId) {
      wx.setStorageSync(LOGIN_SESSION_KEY, String(userId).trim())
    } else {
      wx.removeStorageSync(LOGIN_SESSION_KEY)
    }
  } catch (error) {
    console.warn('save login session failed', error)
  }
}

function readLoginSession() {
  try {
    const value = wx.getStorageSync(LOGIN_SESSION_KEY)
    return value ? String(value).trim() : ''
  } catch (error) {
    console.warn('read login session failed', error)
    return ''
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
    let user = normalizeUserRecord(res?.result?.user || null)
    if (user?.id) {
      try {
        const savedProfile = await fetchProfileByUserId(user.id)
        user = mergeUserWithProfile(user, savedProfile)
      } catch (profileError) {
        console.warn('merge saved profile failed', profileError)
      }
    }
    if (user) {
      user.profileSynced = res?.result?.profileSynced !== false
    }
    getApp().globalData.currentUser = user
    try {
      if (user) {
        saveLoginSession(user.id)
        const { currentUserKey } = getUserCacheKeys(user.id)
        wx.setStorageSync(currentUserKey, user)
        wx.setStorageSync('currentUser', user)
      }
    } catch (storageError) {
      console.warn('save currentUser failed', storageError)
    }
    return user
  } catch (error) {
    console.error('miniappAuth failed', error)
    getApp().globalData.currentUser = null
    throw error
  }
}

async function getCurrentUser() {
  const globalUser = getApp().globalData.currentUser || null
  const loginUserId = readLoginSession()
  if (globalUser?.id && (!loginUserId || loginUserId === globalUser.id)) {
    return normalizeUserRecord(globalUser)
  }
  if (!loginUserId) return null
  try {
    const userKeys = getUserCacheKeys(loginUserId)
    const genericCachedUser = wx.getStorageSync('currentUser') || null
    const cachedUser = wx.getStorageSync(userKeys.currentUserKey)
      || wx.getStorageSync(userKeys.currentUserDisplayKey)
      || (genericCachedUser?.id === loginUserId ? genericCachedUser : null)
    if (cachedUser) {
      const normalizedUser = normalizeUserRecord(cachedUser)
      getApp().globalData.currentUser = normalizedUser
      return normalizedUser
    }
  } catch (storageError) {
    console.warn('get currentUser cache failed', storageError)
  }
  saveLoginSession('')
  return null
}

async function requireLoginForAction(message = '请先登录') {
  const user = await getCurrentUser()
  if (user?.id) return user
  wx.showToast({ title: message, icon: 'none' })
  setTimeout(() => {
    wx.switchTab({ url: '/pages/account/index' })
  }, 500)
  return null
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

async function fetchKnowledgeLikeStates(userId = '', knowledgeIds = []) {
  const ids = [...new Set((knowledgeIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return { counts: {}, likedIds: [], dislikeCounts: {}, dislikedIds: [] }
  const counts = {}
  const dislikeCounts = {}
  await Promise.all(ids.map(async (knowledgeId) => {
    try {
      const res = await db.collection('knowledge_likes')
        .where({ knowledge_id: knowledgeId })
        .count()
      counts[knowledgeId] = Number(res?.total || res?.count || 0)
    } catch (error) {
      console.warn('count knowledge likes failed', error)
      counts[knowledgeId] = 0
    }
    try {
      const res = await db.collection('knowledge_dislikes')
        .where({ knowledge_id: knowledgeId })
        .count()
      dislikeCounts[knowledgeId] = Number(res?.total || res?.count || 0)
    } catch (error) {
      console.warn('count knowledge dislikes failed', error)
      dislikeCounts[knowledgeId] = 0
    }
  }))
  if (!userId) return { counts, likedIds: [], dislikeCounts, dislikedIds: [] }
  try {
    const [likeRes, dislikeRes] = await Promise.all([
      db.collection('knowledge_likes').where({ user_id: userId }).limit(200).get(),
      db.collection('knowledge_dislikes').where({ user_id: userId }).limit(200).get(),
    ])
    const likedSet = new Set((likeRes?.data || []).map((item) => item.knowledge_id).filter(Boolean))
    const dislikedSet = new Set((dislikeRes?.data || []).map((item) => item.knowledge_id).filter(Boolean))
    return {
      counts,
      likedIds: ids.filter((id) => likedSet.has(id)),
      dislikeCounts,
      dislikedIds: ids.filter((id) => dislikedSet.has(id)),
    }
  } catch (error) {
    console.warn('fetch knowledge reaction ids failed', error)
    return { counts, likedIds: [], dislikeCounts, dislikedIds: [] }
  }
}

async function toggleKnowledgeLike(userId, knowledgeId) {
  if (!userId || !knowledgeId) return { liked: false, count: 0, disliked: false, dislikeCount: 0 }
  const { data } = await db.collection('knowledge_likes')
    .where({ user_id: userId, knowledge_id: knowledgeId })
    .limit(1)
    .get()

  let liked = true
  if (data && data.length) {
    await db.collection('knowledge_likes').doc(data[0]._id).remove()
    liked = false
  } else {
    await db.collection('knowledge_likes').add({
      data: {
        user_id: userId,
        knowledge_id: knowledgeId,
        created_at: db.serverDate(),
      },
    })
  }
  const dislikeRes = await db.collection('knowledge_dislikes')
    .where({ user_id: userId, knowledge_id: knowledgeId })
    .limit(1)
    .get()
  if (liked && dislikeRes?.data?.length) {
    await db.collection('knowledge_dislikes').doc(dislikeRes.data[0]._id).remove()
  }

  const [countRes, dislikeCountRes] = await Promise.all([
    db.collection('knowledge_likes').where({ knowledge_id: knowledgeId }).count(),
    db.collection('knowledge_dislikes').where({ knowledge_id: knowledgeId }).count(),
  ])
  return {
    liked,
    count: Number(countRes?.total || countRes?.count || 0),
    disliked: false,
    dislikeCount: Number(dislikeCountRes?.total || dislikeCountRes?.count || 0),
  }
}

async function toggleKnowledgeDislike(userId, knowledgeId) {
  if (!userId || !knowledgeId) return { liked: false, count: 0, disliked: false, dislikeCount: 0 }
  const { data } = await db.collection('knowledge_dislikes')
    .where({ user_id: userId, knowledge_id: knowledgeId })
    .limit(1)
    .get()

  let disliked = true
  if (data && data.length) {
    await db.collection('knowledge_dislikes').doc(data[0]._id).remove()
    disliked = false
  } else {
    await db.collection('knowledge_dislikes').add({
      data: {
        user_id: userId,
        knowledge_id: knowledgeId,
        created_at: db.serverDate(),
      },
    })
  }
  const likeRes = await db.collection('knowledge_likes')
    .where({ user_id: userId, knowledge_id: knowledgeId })
    .limit(1)
    .get()
  if (disliked && likeRes?.data?.length) {
    await db.collection('knowledge_likes').doc(likeRes.data[0]._id).remove()
  }

  const [countRes, dislikeCountRes] = await Promise.all([
    db.collection('knowledge_likes').where({ knowledge_id: knowledgeId }).count(),
    db.collection('knowledge_dislikes').where({ knowledge_id: knowledgeId }).count(),
  ])
  return {
    liked: false,
    count: Number(countRes?.total || countRes?.count || 0),
    disliked,
    dislikeCount: Number(dislikeCountRes?.total || dislikeCountRes?.count || 0),
  }
}

async function fetchProblemReactionStates(userId = '', problemIds = []) {
  const ids = [...new Set((problemIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return { counts: {}, likedIds: [], dislikeCounts: {}, dislikedIds: [] }
  const counts = {}
  const dislikeCounts = {}
  await Promise.all(ids.map(async (problemId) => {
    try {
      const res = await db.collection('problem_likes')
        .where({ problem_id: problemId })
        .count()
      counts[problemId] = Number(res?.total || res?.count || 0)
    } catch (error) {
      console.warn('count problem likes failed', error)
      counts[problemId] = 0
    }
    try {
      const res = await db.collection('problem_dislikes')
        .where({ problem_id: problemId })
        .count()
      dislikeCounts[problemId] = Number(res?.total || res?.count || 0)
    } catch (error) {
      console.warn('count problem dislikes failed', error)
      dislikeCounts[problemId] = 0
    }
  }))
  if (!userId) return { counts, likedIds: [], dislikeCounts, dislikedIds: [] }
  try {
    const [likeRes, dislikeRes] = await Promise.all([
      db.collection('problem_likes').where({ user_id: userId }).limit(200).get(),
      db.collection('problem_dislikes').where({ user_id: userId }).limit(200).get(),
    ])
    const likedSet = new Set((likeRes?.data || []).map((item) => item.problem_id).filter(Boolean))
    const dislikedSet = new Set((dislikeRes?.data || []).map((item) => item.problem_id).filter(Boolean))
    return {
      counts,
      likedIds: ids.filter((id) => likedSet.has(id)),
      dislikeCounts,
      dislikedIds: ids.filter((id) => dislikedSet.has(id)),
    }
  } catch (error) {
    console.warn('fetch problem reaction ids failed', error)
    return { counts, likedIds: [], dislikeCounts, dislikedIds: [] }
  }
}

async function toggleProblemLike(userId, problemId) {
  if (!userId || !problemId) return { liked: false, count: 0, disliked: false, dislikeCount: 0 }
  const { data } = await db.collection('problem_likes')
    .where({ user_id: userId, problem_id: problemId })
    .limit(1)
    .get()

  let liked = true
  if (data && data.length) {
    await db.collection('problem_likes').doc(data[0]._id).remove()
    liked = false
  } else {
    await db.collection('problem_likes').add({
      data: {
        user_id: userId,
        problem_id: problemId,
        created_at: db.serverDate(),
      },
    })
  }
  const dislikeRes = await db.collection('problem_dislikes')
    .where({ user_id: userId, problem_id: problemId })
    .limit(1)
    .get()
  if (liked && dislikeRes?.data?.length) {
    await db.collection('problem_dislikes').doc(dislikeRes.data[0]._id).remove()
  }

  const [countRes, dislikeCountRes] = await Promise.all([
    db.collection('problem_likes').where({ problem_id: problemId }).count(),
    db.collection('problem_dislikes').where({ problem_id: problemId }).count(),
  ])
  return {
    liked,
    count: Number(countRes?.total || countRes?.count || 0),
    disliked: false,
    dislikeCount: Number(dislikeCountRes?.total || dislikeCountRes?.count || 0),
  }
}

async function toggleProblemDislike(userId, problemId) {
  if (!userId || !problemId) return { liked: false, count: 0, disliked: false, dislikeCount: 0 }
  const { data } = await db.collection('problem_dislikes')
    .where({ user_id: userId, problem_id: problemId })
    .limit(1)
    .get()

  let disliked = true
  if (data && data.length) {
    await db.collection('problem_dislikes').doc(data[0]._id).remove()
    disliked = false
  } else {
    await db.collection('problem_dislikes').add({
      data: {
        user_id: userId,
        problem_id: problemId,
        created_at: db.serverDate(),
      },
    })
  }
  const likeRes = await db.collection('problem_likes')
    .where({ user_id: userId, problem_id: problemId })
    .limit(1)
    .get()
  if (disliked && likeRes?.data?.length) {
    await db.collection('problem_likes').doc(likeRes.data[0]._id).remove()
  }

  const [countRes, dislikeCountRes] = await Promise.all([
    db.collection('problem_likes').where({ problem_id: problemId }).count(),
    db.collection('problem_dislikes').where({ problem_id: problemId }).count(),
  ])
  return {
    liked: false,
    count: Number(countRes?.total || countRes?.count || 0),
    disliked,
    dislikeCount: Number(dislikeCountRes?.total || dislikeCountRes?.count || 0),
  }
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
  const cached = readDashboardCache(userId)
  if (cached?.favoriteProblems) return cached.favoriteProblems
  try {
    const favoriteIds = await fetchFavorites(userId)
    const rows = await Promise.all(favoriteIds.map((id) => getProblemDetail(id)))
    const favoriteProblems = rows.filter((item) => item?.id && item.title)
    writeDashboardCache(userId, {
      ...(cached || {}),
      favoriteProblems,
    })
    return favoriteProblems
  } catch (error) {
    console.warn('fetchFavoriteProblems failed', error)
    return []
  }
}

async function fetchHistoryProblems(userId) {
  const cached = readDashboardCache(userId)
  if (cached?.historyProblems) return cached.historyProblems
  try {
    const historyRows = await fetchHistory(userId)
    const problemIds = historyRows.map((item) => item.problem_id).filter(Boolean)
    const rows = await Promise.all(problemIds.map((id) => getProblemDetail(id)))
    const historyProblems = rows.filter((item) => item?.id && item.title)
    writeDashboardCache(userId, {
      ...(cached || {}),
      historyProblems,
    })
    return historyProblems
  } catch (error) {
    console.warn('fetchHistoryProblems failed', error)
    return []
  }
}

async function fetchMyProblemSubmissions(userId, options = {}) {
  if (!userId) return []
  const force = options?.force === true
  const cached = force ? null : readDashboardCache(userId)
  if (cached?.problemSubmissions) return cached.problemSubmissions
  try {
    const { data } = await db.collection('user_problems')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    const problemSubmissions = (data || [])
      .filter((item) => !isDeletedSubmission(item))
      .map((item) => ({
        id: item._id,
        problemId: item.problem_id || item._id || '',
        title: item.title || '',
        subtitle: item.subtitle || '',
        category: item.category || '未分类',
        status: item.status || 'pending',
        statusText: item.status === 'published' ? '已通过' : item.status === 'rejected' ? '已拒绝' : item.status === 'hidden' ? '已下架' : '待审核',
        submissionType: item.submission_type || 'problem',
        detailType: item.submission_type === 'knowledge' ? 'knowledge' : item.submission_type === 'service' ? 'service' : 'problem',
        createdAt: item.created_at || null,
        parentProblemTitle: item.parent_problem_title || '',
        image_url: item.image_url || '',
        steps: item.steps || [],
      }))
    writeDashboardCache(userId, {
      ...(cached || {}),
      problemSubmissions,
    })
    return problemSubmissions
  } catch (error) {
    console.warn('fetchMyProblemSubmissions failed', error)
    return []
  }
}

async function getSubmissionDetail(submissionId) {
  if (!submissionId) return null
  try {
    const selectors = [
      { _id: submissionId },
      { problem_id: submissionId },
    ]

    for (const where of selectors) {
      const { data } = await db.collection('user_problems')
        .where(where)
        .limit(1)
        .get()

      const item = data?.[0]
      if (!item) continue
      if (isDeletedSubmission(item)) continue

      const normalizedCauses = normalizeCauseList(item.causes)

      const normalizedSolutions = (item.solutions && item.solutions.length ? item.solutions : item.steps || []).map((step, index) => ({
        step: step.step || index + 1,
        title: step.title || step.text || '',
        detail: step.detail || step.text || '',
        image_url: step.image_url || '',
      }))

      return {
        id: item.problem_id || item._id,
        docId: item._id || '',
        sourceType: 'submission',
        submissionType: item.submission_type || 'problem',
        category: item.category || '用户投稿',
        printerType: item.printerType || '',
        stages: [],
        materials: [],
        estimatedTime: '',
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        causes: normalizedCauses,
        solutions: normalizedSolutions,
        tips: item.tips || '',
        image_url: item.image_url || '',
        detailBlocks: item.detail_blocks || [],
        effectImages: item.effect_images || [],
        searchText: [item.title, item.subtitle, item.description].filter(Boolean).join(' '),
      }
    }
  } catch (error) {
    console.warn('getSubmissionDetail failed', error)
  }
  return null
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
  const currentUser = getApp().globalData.currentUser || null
  const userId = currentUser?.id || currentUser?.uid || readLoginSession() || ''
  getApp().globalData.currentUser = null
  try {
    saveLoginSession('')
    wx.removeStorageSync('currentUser')
    wx.removeStorageSync('currentUserDisplay')
    wx.removeStorageSync('lastWechatProfile')
    if (userId) {
      const { currentUserKey, currentUserDisplayKey, lastWechatProfileKey } = getUserCacheKeys(userId)
      wx.removeStorageSync(currentUserKey)
      wx.removeStorageSync(currentUserDisplayKey)
      wx.removeStorageSync(lastWechatProfileKey)
    }
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach((key) => {
      if (
        /^currentUser(Display)?\:/.test(key) ||
        /^lastWechatProfile\:/.test(key)
      ) {
        wx.removeStorageSync(key)
      }
    })
  } catch (storageError) {
    console.warn('remove currentUser failed', storageError)
  }
}

async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user?.id) return null
  try {
    return await fetchProfileByUserId(user.id)
  } catch (error) {
    console.warn('getCurrentProfile failed', error)
    return null
  }
}

async function submitUserFeedback({ userId, title, content, type = '建议' }) {
  const safeTitle = String(title || '').trim()
  const safeContent = String(content || '').trim()
  if (!userId) throw new Error('请先登录后再提交反馈')
  if (!safeTitle) throw new Error('请填写标题')
  if (!safeContent) throw new Error('请填写内容')

  const user = await getCurrentUser()
  await db.collection('user_feedback').add({
    data: {
      user_id: userId,
      user_name: user?.username || user?.displayName || '微信用户',
      user_avatar: user?.avatarUrl || '',
      type,
      title: safeTitle,
      content: safeContent,
      status: 'pending',
      status_text: '未处理',
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    },
  })
}

async function fetchAdminFeedback({ page = 1, pageSize = 50 } = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 50))
  const { data } = await db.collection('user_feedback')
    .orderBy('created_at', 'desc')
    .skip((safePage - 1) * safePageSize)
    .limit(safePageSize)
    .get()

  return (data || []).map((item) => ({
    id: item._id,
    _id: item._id,
    userId: item.user_id || '',
    userName: item.user_name || '微信用户',
    type: item.type || '建议',
    title: item.title || '',
    content: item.content || '',
    status: item.status || 'pending',
    statusText: item.status === 'resolved' ? '已处理' : '未处理',
    createdAt: item.created_at || null,
  }))
}

async function markFeedbackResolved(feedbackId) {
  if (!feedbackId) return
  await db.collection('user_feedback').doc(feedbackId).update({
    data: {
      status: 'resolved',
      status_text: '已处理',
      updated_at: db.serverDate(),
    },
  })
}

module.exports = {
  ensureUser,
  getCurrentUser,
  requireLoginForAction,
  getCurrentProfile,
  getUserCacheKeys,
  logoutCurrentUser,
  fetchFavorites,
  fetchFavoriteProblems,
  fetchHistoryProblems,
  toggleFavorite,
  fetchKnowledgeLikeStates,
  toggleKnowledgeLike,
  toggleKnowledgeDislike,
  fetchProblemReactionStates,
  toggleProblemLike,
  toggleProblemDislike,
  recordHistory,
  fetchHistory,
  fetchMyProblemSubmissions,
  getSubmissionDetail,
  fetchMyMarketPosts,
  submitUserFeedback,
  fetchAdminFeedback,
  markFeedbackResolved,
  readDashboardCache,
  writeDashboardCache,
}
