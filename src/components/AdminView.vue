<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, cmd } from '@/lib/tcb.js'
import { problems as allProblems } from '@/data/problems.js'
import { useProblemMeta } from '@/composables/useProblemMeta.js'
import { invalidateProblemLibraryCache } from '@/composables/useProblemLibrary.js'
import { invalidateUserStatusCache } from '@/composables/useUserGuard.js'

const props = defineProps({ currentUser: Object })
const emit = defineEmits(['back'])

const CAT_META = {
  '打印机整机': { color: '#74b9ff', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1a2d 100%)', emoji: '🖨️' },
  '喷头热端': { color: '#ff7675', bg: 'linear-gradient(135deg,#1a0a0a 0%,#2d1010 100%)', emoji: '🔥' },
  '挤出机': { color: '#b2bec3', bg: 'linear-gradient(135deg,#0f1214 0%,#1a1e22 100%)', emoji: '⚙️' },
  '热床': { color: '#fd79a8', bg: 'linear-gradient(135deg,#1a0a12 0%,#2d0f1e 100%)', emoji: '🛏️' },
  'AMS送料': { color: '#a29bfe', bg: 'linear-gradient(135deg,#0f0a1a 0%,#1a0f2d 100%)', emoji: '🎡' },
  '耗材材料': { color: '#fdcb6e', bg: 'linear-gradient(135deg,#1a160a 0%,#2d230f 100%)', emoji: '🧵' },
  '切片软件': { color: '#00cec9', bg: 'linear-gradient(135deg,#0a1a1a 0%,#0f2d2d 100%)', emoji: '✂️' },
  '校准调平': { color: '#0984e3', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1e2d 100%)', emoji: '📐' },
  '打印质量': { color: '#e17055', bg: 'linear-gradient(135deg,#1a120a 0%,#2d1e0f 100%)', emoji: '🎨' },
  '固件设置': { color: '#55efc4', bg: 'linear-gradient(135deg,#0a1a14 0%,#0f2d1e 100%)', emoji: '⚡' },
}

const adminSection = ref('submissions')

const sectionMeta = {
  submissions: { label: '投稿管理', desc: '审核用户提交的问题内容' },
  market: { label: '需求市场', desc: '管理技术求助与代打需求' },
  providers: { label: '服务商审核', desc: '审核服务商入驻申请' },
  users: { label: '用户管理', desc: '查看用户资料、权限与账号状态' },
  stats: { label: '数据统计', desc: '查看平台核心数据趋势' },
  problems: { label: '故障图片', desc: '给问题库补充封面图' },
}

function safeText(value) {
  return String(value || '').trim()
}

function includesKeyword(list, query) {
  if (!query) return true
  return list.some((value) => safeText(value).toLowerCase().includes(query))
}

function normalizeDate(val) {
  if (val instanceof Date) return val
  if (!val) return null
  const date = new Date(val)
  return Number.isNaN(date.getTime()) ? null : date
}

function getTimeValue(val) {
  return normalizeDate(val)?.getTime() || 0
}

function timeAgo(ts) {
  if (!ts) return '未知时间'
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  return `${Math.floor(seconds / 86400)} 天前`
}

function formatDateTime(ts) {
  if (!ts) return '未知时间'
  const date = new Date(ts)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function chunkArray(list = [], size = 50) {
  const result = []
  for (let i = 0; i < list.length; i += size) {
    result.push(list.slice(i, i + size))
  }
  return result
}

function normalizeBool(value) {
  return value === true || value === 'true' || value === 1
}

function normalizeUserStatus(value) {
  return safeText(value) === 'disabled' ? 'disabled' : 'active'
}

async function fetchCollectionByUserIds(collectionName, userIds, field = 'user_id') {
  const chunks = chunkArray([...new Set((userIds || []).filter(Boolean))], 50)
  const rows = []

  for (const ids of chunks) {
    if (!ids.length) continue
    try {
      const { data } = await db.collection(collectionName)
        .where({ [field]: cmd.in(ids) })
        .limit(500)
        .get()
      rows.push(...(data || []))
    } catch (error) {
      console.warn(`[Admin ${collectionName}] load failed:`, error?.message || error)
    }
  }

  return rows
}

function aggregateCountByField(rows, field) {
  const map = {}
  ;(rows || []).forEach((row) => {
    const key = row?.[field]
    if (!key) return
    map[key] = (map[key] || 0) + 1
  })
  return map
}

function aggregateLatestByField(rows, field, timeField = 'created_at') {
  const map = {}
  ;(rows || []).forEach((row) => {
    const key = row?.[field]
    if (!key) return
    const time = getTimeValue(row?.[timeField])
    if (!time) return
    map[key] = Math.max(map[key] || 0, time)
  })
  return map
}

function buildProblemSearchText({ title, subtitle, description, causes }) {
  return [title, subtitle, description, ...(causes || [])].filter(Boolean).join(' ')
}

function buildProblemLibraryDoc(problemId, payload) {
  const meta = CAT_META[payload.category] || { color: '#ff6b6b', bg: 'linear-gradient(135deg,#1a0a0a,#2d0f0f)', emoji: '🔧' }
  const causes = (payload.causes || []).map(safeText).filter(Boolean)
  const solutions = (payload.solutions || [])
    .filter((solution) => safeText(solution?.title))
    .map((solution, index) => ({
      step: index + 1,
      title: safeText(solution.title),
      detail: safeText(solution.detail),
      image_url: solution.image_url || null,
    }))

  return {
    problem_id: problemId,
    status: payload.status || 'published',
    category: payload.category || '未分类',
    printerType: payload.printerType || null,
    difficulty: payload.difficulty || '常见',
    title: safeText(payload.title),
    subtitle: safeText(payload.subtitle),
    description: safeText(payload.description),
    causes,
    solutions,
    tips: safeText(payload.tips),
    image_url: payload.image_url || null,
    video: payload.video || null,
    emoji: meta.emoji,
    color: meta.color,
    bgGradient: meta.bg,
    search_text: buildProblemSearchText({
      title: payload.title,
      subtitle: payload.subtitle,
      description: payload.description,
      causes,
    }),
    source: payload.source || 'user_submitted',
    updated_at: new Date(),
  }
}

async function removeProblemLibraryDoc(problemId) {
  const { data } = await db.collection('problems').where({ problem_id: problemId }).limit(1).get()
  if (data?.length) await db.collection('problems').doc(data[0]._id).remove()
  invalidateProblemLibraryCache([problemId])
}

async function upsertProblemLibraryDoc(problemId, payload) {
  const collection = db.collection('problems')
  const { data } = await collection.where({ problem_id: problemId }).limit(1).get()
  const doc = buildProblemLibraryDoc(problemId, payload)
  if (data?.length) {
    await collection.doc(data[0]._id).update(doc)
  } else {
    await collection.add({
      ...doc,
      created_at: new Date(),
    })
  }
  invalidateProblemLibraryCache([problemId])
}

function submissionStatusLabel(status) {
  return ({
    pending: '待审核',
    published: '已展示',
    hidden: '已隐藏',
    rejected: '已拒绝',
  })[status] || '待审核'
}

function marketStatusLabel(status) {
  return status || '待解决'
}

function providerStatusLabel(status) {
  return ({
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  })[status] || '待审核'
}

function userStatusLabel(status) {
  return status === 'disabled' ? '已禁用' : '正常'
}

// 投稿管理
const submissionsLoading = ref(false)
const submissionSearch = ref('')
const submissionFilter = ref('all')
const submissionItems = ref([])
const submissionActioningId = ref(null)

async function loadSubmissions() {
  submissionsLoading.value = true
  try {
    const { data } = await db.collection('user_problems')
      .orderBy('created_at', 'desc')
      .limit(200)
      .get()

    submissionItems.value = (data || []).map((doc) => {
      const createdAt = getTimeValue(doc.created_at)
      const status = doc.status || 'pending'
      return {
        id: doc._id,
        problemId: doc.problem_id || doc._id,
        status,
        title: safeText(doc.title),
        subtitle: safeText(doc.subtitle),
        description: safeText(doc.description),
        category: safeText(doc.category) || '未分类',
        difficulty: safeText(doc.difficulty) || '常见',
        image_url: doc.image_url || null,
        causes: doc.causes || [],
        solutions: doc.solutions || [],
        tips: safeText(doc.tips),
        username: safeText(doc.username) || '匿名用户',
        userId: doc.user_id || '',
        createdAt,
      }
    })
  } catch (error) {
    console.warn('[Admin submissions] load failed:', error?.message || error)
  } finally {
    submissionsLoading.value = false
  }
}

const submissionStats = computed(() => ({
  total: submissionItems.value.length,
  pending: submissionItems.value.filter((item) => item.status === 'pending').length,
  published: submissionItems.value.filter((item) => item.status === 'published').length,
  hidden: submissionItems.value.filter((item) => item.status === 'hidden').length,
  rejected: submissionItems.value.filter((item) => item.status === 'rejected').length,
}))

const filteredSubmissions = computed(() => {
  const q = submissionSearch.value.trim().toLowerCase()
  return submissionItems.value.filter((item) => {
    if (submissionFilter.value !== 'all' && item.status !== submissionFilter.value) return false
    if (!q) return true
    return includesKeyword([
      item.title,
      item.subtitle,
      item.description,
      item.problemId,
      item.username,
      item.category,
      ...(item.causes || []),
    ], q)
  })
})

async function setSubmissionStatus(item, status) {
  submissionActioningId.value = item.id
  try {
    await db.collection('user_problems').doc(item.id).update({ status })
    if (status === 'published') {
      await upsertProblemLibraryDoc(item.problemId, {
        category: item.category,
        difficulty: item.difficulty,
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        causes: item.causes,
        solutions: item.solutions,
        tips: item.tips,
        image_url: item.image_url,
        source: 'user_submitted',
      })
    } else {
      await removeProblemLibraryDoc(item.problemId)
    }
    item.status = status
  } finally {
    submissionActioningId.value = null
  }
}

async function deleteSubmission(item) {
  if (!confirm(`确定删除投稿「${item.title || item.problemId}」吗？`)) return
  submissionActioningId.value = item.id
  try {
    await db.collection('user_problems').doc(item.id).remove()
    await removeProblemLibraryDoc(item.problemId)
    submissionItems.value = submissionItems.value.filter((row) => row.id !== item.id)
  } finally {
    submissionActioningId.value = null
  }
}

// 需求市场
const marketLoading = ref(false)
const marketSearch = ref('')
const marketFilter = ref('all')
const marketItems = ref([])
const marketActioningId = ref(null)

async function loadMarket() {
  marketLoading.value = true
  try {
    const { data } = await db.collection('market_posts')
      .orderBy('created_at', 'desc')
      .limit(200)
      .get()

    const userIds = [...new Set((data || []).map((item) => item.user_id).filter(Boolean))]
    let profileMap = {}

    if (userIds.length) {
      try {
        const { data: profiles } = await db.collection('profiles')
          .where({ uid: cmd.in(userIds) })
          .limit(userIds.length)
          .get()
        profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.uid, profile]))
      } catch (error) {
        console.warn('[Admin market] profiles failed:', error?.message || error)
      }
    }

    marketItems.value = (data || []).map((doc) => ({
      id: doc._id,
      title: safeText(doc.title),
      description: safeText(doc.description),
      category: safeText(doc.category) || '未分类',
      budget: safeText(doc.budget) || '未填写',
      contact: safeText(doc.contact) || '未填写',
      status: safeText(doc.status) || '待解决',
      images: doc.images || [],
      userId: doc.user_id || '',
      username: safeText(profileMap[doc.user_id]?.username) || '匿名用户',
      createdAt: getTimeValue(doc.created_at),
      viewCount: doc.view_count || 0,
      interestCount: doc.interest_count || 0,
    }))
  } catch (error) {
    console.warn('[Admin market] load failed:', error?.message || error)
  } finally {
    marketLoading.value = false
  }
}

const marketStats = computed(() => ({
  total: marketItems.value.length,
  open: marketItems.value.filter((item) => item.status === '待解决').length,
  solved: marketItems.value.filter((item) => item.status === '已解决').length,
  other: marketItems.value.filter((item) => !['待解决', '已解决'].includes(item.status)).length,
}))

const filteredMarketItems = computed(() => {
  const q = marketSearch.value.trim().toLowerCase()
  return marketItems.value.filter((item) => {
    if (marketFilter.value !== 'all' && item.status !== marketFilter.value) return false
    if (!q) return true
    return includesKeyword([
      item.title,
      item.description,
      item.category,
      item.username,
      item.contact,
      item.budget,
    ], q)
  })
})

async function setMarketStatus(item, status) {
  marketActioningId.value = item.id
  try {
    await db.collection('market_posts').doc(item.id).update({ status })
    item.status = status
  } finally {
    marketActioningId.value = null
  }
}

async function deleteMarketPost(item) {
  if (!confirm(`确定删除需求「${item.title}」吗？`)) return
  marketActioningId.value = item.id
  try {
    await db.collection('market_posts').doc(item.id).remove()
    marketItems.value = marketItems.value.filter((row) => row.id !== item.id)
  } finally {
    marketActioningId.value = null
  }
}

// 服务商审核
const providerLoading = ref(false)
const providerItems = ref([])
const providerSearch = ref('')
const providerFilter = ref('pending')
const providerActioningId = ref(null)

async function loadProviders() {
  providerLoading.value = true
  try {
    const { data } = await db.collection('service_providers')
      .orderBy('created_at', 'desc')
      .limit(200)
      .get()

    providerItems.value = (data || []).map((doc) => ({
      id: doc._id,
      name: safeText(doc.name) || '未命名服务商',
      type: safeText(doc.type) || '未填写',
      province: safeText(doc.province),
      city: safeText(doc.city),
      wechat: safeText(doc.wechat),
      phone: safeText(doc.phone),
      leadTime: safeText(doc.lead_time),
      minOrder: safeText(doc.min_order),
      priceRange: safeText(doc.price_range),
      desc: safeText(doc.desc),
      specialties: doc.specialties || [],
      materials: doc.materials || [],
      postProcess: doc.post_process || [],
      status: doc.status || 'pending',
      username: safeText(doc.username) || '匿名用户',
      createdAt: getTimeValue(doc.created_at),
    }))
  } catch (error) {
    if (!error?.code?.includes('COLLECTION_NOT_EXIST') && !error?.message?.includes('not exist')) {
      console.warn('[Admin providers] load failed:', error?.message || error)
    }
  } finally {
    providerLoading.value = false
  }
}

const providerStats = computed(() => ({
  total: providerItems.value.length,
  pending: providerItems.value.filter((item) => item.status === 'pending').length,
  approved: providerItems.value.filter((item) => item.status === 'approved').length,
  rejected: providerItems.value.filter((item) => item.status === 'rejected').length,
}))

const filteredProviders = computed(() => {
  const q = providerSearch.value.trim().toLowerCase()
  return providerItems.value.filter((item) => {
    if (providerFilter.value !== 'all' && item.status !== providerFilter.value) return false
    if (!q) return true
    return includesKeyword([
      item.name,
      item.type,
      item.province,
      item.city,
      item.username,
      item.wechat,
      item.phone,
      ...(item.specialties || []),
      ...(item.materials || []),
    ], q)
  })
})

async function setProviderStatus(item, status) {
  providerActioningId.value = item.id
  try {
    await db.collection('service_providers').doc(item.id).update({ status })
    item.status = status
  } finally {
    providerActioningId.value = null
  }
}

async function deleteProvider(item) {
  if (!confirm(`确定删除服务商「${item.name}」吗？`)) return
  providerActioningId.value = item.id
  try {
    await db.collection('service_providers').doc(item.id).remove()
    providerItems.value = providerItems.value.filter((row) => row.id !== item.id)
  } finally {
    providerActioningId.value = null
  }
}

// 用户管理
const usersLoading = ref(false)
const userSearch = ref('')
const userFilter = ref('all')
const userItems = ref([])
const userActioningId = ref(null)
const userDetailVisible = ref(false)
const userDetailLoading = ref(false)
const userDetail = ref(null)

async function loadUsers() {
  usersLoading.value = true
  try {
    const { data: profiles } = await db.collection('profiles')
      .orderBy('uid', 'asc')
      .limit(200)
      .get()

    const userIds = (profiles || []).map((profile) => profile.uid).filter(Boolean)
    const [problemRows, marketRows, commentRows, solutionRows, favoriteRows] = await Promise.all([
      fetchCollectionByUserIds('user_problems', userIds),
      fetchCollectionByUserIds('market_posts', userIds),
      fetchCollectionByUserIds('comments', userIds),
      fetchCollectionByUserIds('solutions', userIds),
      fetchCollectionByUserIds('problem_favorites', userIds),
    ])

    const problemCountMap = aggregateCountByField(problemRows, 'user_id')
    const marketCountMap = aggregateCountByField(marketRows, 'user_id')
    const commentCountMap = aggregateCountByField(commentRows, 'user_id')
    const solutionCountMap = aggregateCountByField(solutionRows, 'user_id')
    const favoriteCountMap = aggregateCountByField(favoriteRows, 'user_id')

    const activeSources = [
      aggregateLatestByField(problemRows, 'user_id'),
      aggregateLatestByField(marketRows, 'user_id'),
      aggregateLatestByField(commentRows, 'user_id'),
      aggregateLatestByField(solutionRows, 'user_id'),
      aggregateLatestByField(favoriteRows, 'user_id'),
    ]

    userItems.value = (profiles || []).map((profile) => {
      const uid = profile.uid
      const latestActivity = Math.max(0, ...activeSources.map((source) => source[uid] || 0))
      const submissions = problemCountMap[uid] || 0
      const posts = marketCountMap[uid] || 0
      const comments = (commentCountMap[uid] || 0) + (solutionCountMap[uid] || 0)
      const favorites = favoriteCountMap[uid] || 0

      return {
        id: profile._id,
        uid,
        username: safeText(profile.username) || '未设置用户名',
        avatar: safeText(profile.avatar) || '?',
        phone: safeText(profile.phone) || '未填写',
        points: profile.points ?? 0,
        isAdmin: normalizeBool(profile.isAdmin),
        status: normalizeUserStatus(profile.status),
        createdAt: getTimeValue(profile.created_at) || 0,
        latestActivity,
        submissionCount: submissions,
        marketCount: posts,
        commentCount: comments,
        favoriteCount: favorites,
        totalContribution: submissions + posts + comments,
      }
    })
      .sort((a, b) => {
        const statusDiff = Number(a.status === 'disabled') - Number(b.status === 'disabled')
        if (statusDiff !== 0) return statusDiff
        return (b.latestActivity || b.totalContribution) - (a.latestActivity || a.totalContribution)
      })
  } catch (error) {
    console.warn('[Admin users] load failed:', error?.message || error)
  } finally {
    usersLoading.value = false
  }
}

const userStats = computed(() => ({
  total: userItems.value.length,
  active: userItems.value.filter((item) => item.status === 'active').length,
  disabled: userItems.value.filter((item) => item.status === 'disabled').length,
  admins: userItems.value.filter((item) => item.isAdmin).length,
}))

const filteredUserItems = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  return userItems.value.filter((item) => {
    if (userFilter.value === 'admins' && !item.isAdmin) return false
    if (userFilter.value === 'active' && item.status !== 'active') return false
    if (userFilter.value === 'disabled' && item.status !== 'disabled') return false
    if (!q) return true
    return includesKeyword([
      item.username,
      item.uid,
      item.phone,
      item.avatar,
    ], q)
  })
})

async function updateUserRole(item, isAdmin) {
  userActioningId.value = item.id
  try {
    await db.collection('profiles').doc(item.id).update({ isAdmin })
    item.isAdmin = isAdmin
    if (userDetail.value?.uid === item.uid) userDetail.value.profile.isAdmin = isAdmin
  } finally {
    userActioningId.value = null
  }
}

async function updateUserStatus(item, status) {
  userActioningId.value = item.id
  try {
    await db.collection('profiles').doc(item.id).update({ status })
    item.status = status
    invalidateUserStatusCache(item.uid)
    if (userDetail.value?.uid === item.uid) userDetail.value.profile.status = status
  } finally {
    userActioningId.value = null
  }
}

async function deleteUser(item) {
  if (!confirm(`确定删除用户「${item.username}」吗？这只会删除 profiles 中的用户资料记录。`)) return
  userActioningId.value = item.id
  try {
    await db.collection('profiles').doc(item.id).remove()
    userItems.value = userItems.value.filter((row) => row.id !== item.id)
    invalidateUserStatusCache(item.uid)
    if (userDetail.value?.uid === item.uid) closeUserDetail()
  } finally {
    userActioningId.value = null
  }
}

async function openUserDetail(item) {
  userDetailVisible.value = true
  userDetailLoading.value = true
  userDetail.value = null

  try {
    const uid = item.uid
    const [problemRes, marketRes, commentRes, solutionRes] = await Promise.all([
      db.collection('user_problems').where({ user_id: uid }).orderBy('created_at', 'desc').limit(50).get(),
      db.collection('market_posts').where({ user_id: uid }).orderBy('created_at', 'desc').limit(50).get(),
      db.collection('comments').where({ user_id: uid }).orderBy('created_at', 'desc').limit(50).get(),
      db.collection('solutions').where({ user_id: uid }).orderBy('created_at', 'desc').limit(50).get(),
    ])

    userDetail.value = {
      uid,
      profile: item,
      problems: (problemRes.data || []).map((row) => ({
        id: row._id,
        title: safeText(row.title) || '未命名投稿',
        category: safeText(row.category) || '未分类',
        status: submissionStatusLabel(row.status || 'pending'),
        createdAt: getTimeValue(row.created_at),
      })),
      markets: (marketRes.data || []).map((row) => ({
        id: row._id,
        title: safeText(row.title) || '未命名需求',
        category: safeText(row.category) || '未分类',
        status: safeText(row.status) || '待解决',
        createdAt: getTimeValue(row.created_at),
      })),
      comments: (commentRes.data || []).map((row) => ({
        id: row._id,
        content: safeText(row.content) || '空内容',
        problemId: row.problem_id || '',
        createdAt: getTimeValue(row.created_at),
      })),
      solutions: (solutionRes.data || []).map((row) => ({
        id: row._id,
        title: safeText(row.title) || '未命名方案',
        detail: safeText(row.detail) || '空内容',
        problemId: row.problem_id || '',
        createdAt: getTimeValue(row.created_at),
      })),
    }
  } catch (error) {
    console.warn('[Admin user detail] load failed:', error?.message || error)
  } finally {
    userDetailLoading.value = false
  }
}

function closeUserDetail() {
  userDetailVisible.value = false
  userDetailLoading.value = false
  userDetail.value = null
}

// 数据统计
const statsLoading = ref(false)
const stats = ref({
  users: '–',
  posts: '–',
  comments: '–',
  favorites: '–',
  submissions: '–',
  providers: '–',
})
const trend = ref([])

async function loadStats() {
  statsLoading.value = true
  try {
    const [usersR, postsR, commentsR, favoritesR, submissionsR, providersR] = await Promise.allSettled([
      db.collection('profiles').count(),
      db.collection('market_posts').count(),
      db.collection('market_comments').count(),
      db.collection('problem_favorites').count(),
      db.collection('user_problems').count(),
      db.collection('service_providers').count(),
    ])

    stats.value = {
      users: usersR.status === 'fulfilled' ? usersR.value.total : '?',
      posts: postsR.status === 'fulfilled' ? postsR.value.total : '?',
      comments: commentsR.status === 'fulfilled' ? commentsR.value.total : '?',
      favorites: favoritesR.status === 'fulfilled' ? favoritesR.value.total : '?',
      submissions: submissionsR.status === 'fulfilled' ? submissionsR.value.total : '?',
      providers: providersR.status === 'fulfilled' ? providersR.value.total : '?',
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    let recent = []
    try {
      const { data } = await db.collection('market_posts')
        .where({ created_at: cmd.gte(since) })
        .orderBy('created_at', 'asc')
        .limit(200)
        .get()
      recent = data || []
    } catch {}

    const buckets = {}
    const labels = []
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = `${date.getMonth() + 1}/${date.getDate()}`
      buckets[key] = 0
      labels.push(key)
    }

    recent.forEach((item) => {
      const date = normalizeDate(item.created_at)
      if (!date) return
      const key = `${date.getMonth() + 1}/${date.getDate()}`
      if (key in buckets) buckets[key] += 1
    })

    const maxVal = Math.max(...Object.values(buckets), 1)
    trend.value = labels.map((day) => ({
      day,
      count: buckets[day],
      pct: Math.round((buckets[day] / maxVal) * 100),
    }))
  } catch (error) {
    console.warn('[Admin stats] load failed:', error?.message || error)
  } finally {
    statsLoading.value = false
  }
}

// 故障图片
const { metaMap, fetchProblemMeta, uploadProblemImage, removeProblemImage } = useProblemMeta()
const imgUploading = ref({})
const imgSearch = ref('')

const filteredProblems = computed(() => {
  const q = imgSearch.value.trim().toLowerCase()
  if (!q) return allProblems
  return allProblems.filter((problem) => {
    return includesKeyword([problem.title, problem.id, problem.category], q)
  })
})

async function handleImgUpload(problem, event) {
  const file = event.target.files[0]
  if (!file) return
  event.target.value = ''
  imgUploading.value = { ...imgUploading.value, [problem.id]: true }
  try {
    await uploadProblemImage(problem.id, file)
  } catch (error) {
    alert(`上传失败：${error.message || error}`)
  } finally {
    const next = { ...imgUploading.value }
    delete next[problem.id]
    imgUploading.value = next
  }
}

async function handleImgRemove(problem) {
  if (!confirm(`确定删除「${problem.title}」的图片吗？`)) return
  await removeProblemImage(problem.id)
}

function switchSection(section) {
  adminSection.value = section
  refreshCurrentSection()
}

function refreshCurrentSection() {
  if (adminSection.value === 'submissions') loadSubmissions()
  else if (adminSection.value === 'market') loadMarket()
  else if (adminSection.value === 'providers') loadProviders()
  else if (adminSection.value === 'users') loadUsers()
  else if (adminSection.value === 'stats') loadStats()
  else if (adminSection.value === 'problems') fetchProblemMeta(true)
}

const currentSectionTitle = computed(() => sectionMeta[adminSection.value]?.label || '管理后台')
const currentSectionDesc = computed(() => sectionMeta[adminSection.value]?.desc || '')
const currentLoading = computed(() => {
  if (adminSection.value === 'submissions') return submissionsLoading.value
  if (adminSection.value === 'market') return marketLoading.value
  if (adminSection.value === 'providers') return providerLoading.value
  if (adminSection.value === 'users') return usersLoading.value
  if (adminSection.value === 'stats') return statsLoading.value
  return false
})

onMounted(() => {
  refreshCurrentSection()
})
</script>

<template>
  <div class="admin-page">
    <div class="admin-nav">
      <button class="back-btn" @click="emit('back')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        返回
      </button>
      <span class="admin-title">管理后台</span>
      <div class="nav-section-tabs">
        <button :class="['nsec-btn', { active: adminSection === 'submissions' }]" @click="switchSection('submissions')">投稿管理</button>
        <button :class="['nsec-btn', { active: adminSection === 'market' }]" @click="switchSection('market')">需求市场</button>
        <button :class="['nsec-btn', { active: adminSection === 'providers' }]" @click="switchSection('providers')">服务商审核</button>
        <button :class="['nsec-btn', { active: adminSection === 'users' }]" @click="switchSection('users')">用户管理</button>
        <button :class="['nsec-btn', { active: adminSection === 'stats' }]" @click="switchSection('stats')">数据统计</button>
        <button :class="['nsec-btn', { active: adminSection === 'problems' }]" @click="switchSection('problems')">故障图片</button>
      </div>
      <button class="refresh-btn" :disabled="currentLoading" @click="refreshCurrentSection">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" :class="{ spinning: currentLoading }">
          <path d="M13 7.5A5.5 5.5 0 112 7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <path d="M13 4v3.5h-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        刷新
      </button>
    </div>

    <div class="admin-content">
      <div class="section-head">
        <div>
          <div class="section-kicker">运营中台</div>
          <h1 class="section-title">{{ currentSectionTitle }}</h1>
          <p class="section-desc">{{ currentSectionDesc }}</p>
        </div>
      </div>

      <div v-if="adminSection === 'submissions'">
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-num">{{ submissionStats.total }}</div>
            <div class="stat-label">投稿总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-num pending-color">{{ submissionStats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
          <div class="stat-card">
            <div class="stat-num approved-color">{{ submissionStats.published }}</div>
            <div class="stat-label">已展示</div>
          </div>
          <div class="stat-card">
            <div class="stat-num rejected-color">{{ submissionStats.hidden + submissionStats.rejected }}</div>
            <div class="stat-label">隐藏/拒绝</div>
          </div>
        </div>

        <div class="toolbar">
          <input v-model="submissionSearch" class="toolbar-search" placeholder="搜索标题、投稿人、分类、原因..." />
          <div class="filter-pills">
            <button :class="['pill-btn', { active: submissionFilter === 'all' }]" @click="submissionFilter = 'all'">全部</button>
            <button :class="['pill-btn', { active: submissionFilter === 'pending' }]" @click="submissionFilter = 'pending'">待审核</button>
            <button :class="['pill-btn', { active: submissionFilter === 'published' }]" @click="submissionFilter = 'published'">已展示</button>
            <button :class="['pill-btn', { active: submissionFilter === 'hidden' }]" @click="submissionFilter = 'hidden'">已隐藏</button>
            <button :class="['pill-btn', { active: submissionFilter === 'rejected' }]" @click="submissionFilter = 'rejected'">已拒绝</button>
          </div>
        </div>

        <div v-if="submissionsLoading" class="loading-state">
          <span class="spinner"></span>
          <span>正在加载投稿数据…</span>
        </div>
        <div v-else-if="filteredSubmissions.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div>当前没有符合条件的投稿</div>
        </div>
        <div v-else class="entity-list">
          <article v-for="item in filteredSubmissions" :key="item.id" class="entity-card">
            <div class="entity-head">
              <div class="entity-main">
                <div class="entity-title-row">
                  <h3 class="entity-title">{{ item.title || '未命名投稿' }}</h3>
                  <span :class="['status-badge', item.status]">{{ submissionStatusLabel(item.status) }}</span>
                </div>
                <div class="entity-meta">
                  <span>{{ item.category }}</span>
                  <span class="dot">·</span>
                  <span>{{ item.difficulty }}</span>
                  <span class="dot">·</span>
                  <span>{{ item.username }}</span>
                  <span class="dot">·</span>
                  <span>{{ timeAgo(item.createdAt) }}</span>
                </div>
              </div>
              <div class="entity-actions">
                <button
                  class="action-btn approve"
                  :disabled="submissionActioningId === item.id || item.status === 'published'"
                  @click="setSubmissionStatus(item, 'published')"
                >
                  展示
                </button>
                <button
                  class="action-btn neutral"
                  :disabled="submissionActioningId === item.id || item.status === 'pending'"
                  @click="setSubmissionStatus(item, 'pending')"
                >
                  待审
                </button>
                <button
                  class="action-btn warn"
                  :disabled="submissionActioningId === item.id || item.status === 'hidden'"
                  @click="setSubmissionStatus(item, 'hidden')"
                >
                  隐藏
                </button>
                <button class="action-btn reject" :disabled="submissionActioningId === item.id" @click="setSubmissionStatus(item, 'rejected')">拒绝</button>
                <button class="action-btn ghost" :disabled="submissionActioningId === item.id" @click="deleteSubmission(item)">删除</button>
              </div>
            </div>

            <div class="entity-detail-grid">
              <div class="detail-block">
                <span class="detail-label">问题描述</span>
                <p class="detail-text">{{ item.description || '未填写描述' }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">可能原因</span>
                <p class="detail-text">{{ item.causes.length ? item.causes.join('、') : '未填写' }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">解决步骤</span>
                <p class="detail-text">{{ item.solutions.length ? item.solutions.map((solution) => solution.title).join('、') : '未填写' }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">记录信息</span>
                <p class="detail-text mono-text">ID：{{ item.problemId }}<br>提交时间：{{ formatDateTime(item.createdAt) }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else-if="adminSection === 'market'">
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-num">{{ marketStats.total }}</div>
            <div class="stat-label">需求总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-num pending-color">{{ marketStats.open }}</div>
            <div class="stat-label">待解决</div>
          </div>
          <div class="stat-card">
            <div class="stat-num approved-color">{{ marketStats.solved }}</div>
            <div class="stat-label">已解决</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ marketStats.other }}</div>
            <div class="stat-label">其他状态</div>
          </div>
        </div>

        <div class="toolbar">
          <input v-model="marketSearch" class="toolbar-search" placeholder="搜索需求标题、分类、联系人..." />
          <div class="filter-pills">
            <button :class="['pill-btn', { active: marketFilter === 'all' }]" @click="marketFilter = 'all'">全部</button>
            <button :class="['pill-btn', { active: marketFilter === '待解决' }]" @click="marketFilter = '待解决'">待解决</button>
            <button :class="['pill-btn', { active: marketFilter === '已解决' }]" @click="marketFilter = '已解决'">已解决</button>
          </div>
        </div>

        <div v-if="marketLoading" class="loading-state">
          <span class="spinner"></span>
          <span>正在加载需求数据…</span>
        </div>
        <div v-else-if="filteredMarketItems.length === 0" class="empty-state">
          <div class="empty-icon">🧾</div>
          <div>当前没有符合条件的需求</div>
        </div>
        <div v-else class="entity-list">
          <article v-for="item in filteredMarketItems" :key="item.id" class="entity-card">
            <div class="entity-head">
              <div class="entity-main">
                <div class="entity-title-row">
                  <h3 class="entity-title">{{ item.title }}</h3>
                  <span :class="['status-badge', item.status === '已解决' ? 'published' : 'pending']">{{ marketStatusLabel(item.status) }}</span>
                </div>
                <div class="entity-meta">
                  <span>{{ item.category }}</span>
                  <span class="dot">·</span>
                  <span>{{ item.username }}</span>
                  <span class="dot">·</span>
                  <span>预算 {{ item.budget }}</span>
                  <span class="dot">·</span>
                  <span>{{ timeAgo(item.createdAt) }}</span>
                </div>
              </div>
              <div class="entity-actions">
                <button class="action-btn neutral" :disabled="marketActioningId === item.id" @click="setMarketStatus(item, '待解决')">标记待解决</button>
                <button class="action-btn approve" :disabled="marketActioningId === item.id" @click="setMarketStatus(item, '已解决')">标记已解决</button>
                <button class="action-btn ghost" :disabled="marketActioningId === item.id" @click="deleteMarketPost(item)">删除</button>
              </div>
            </div>

            <div class="entity-detail-grid">
              <div class="detail-block">
                <span class="detail-label">需求说明</span>
                <p class="detail-text">{{ item.description || '未填写说明' }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">联系方式</span>
                <p class="detail-text">{{ item.contact }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">热度数据</span>
                <p class="detail-text">浏览 {{ item.viewCount }} · 感兴趣 {{ item.interestCount }} · 图片 {{ item.images.length }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">发布时间</span>
                <p class="detail-text">{{ formatDateTime(item.createdAt) }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else-if="adminSection === 'providers'">
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-num pending-color">{{ providerStats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
          <div class="stat-card">
            <div class="stat-num approved-color">{{ providerStats.approved }}</div>
            <div class="stat-label">已通过</div>
          </div>
          <div class="stat-card">
            <div class="stat-num rejected-color">{{ providerStats.rejected }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ providerStats.total }}</div>
            <div class="stat-label">总计</div>
          </div>
        </div>

        <div class="toolbar">
          <input v-model="providerSearch" class="toolbar-search" placeholder="搜索服务商、地区、材料、联系人..." />
          <div class="filter-pills">
            <button :class="['pill-btn', { active: providerFilter === 'all' }]" @click="providerFilter = 'all'">全部</button>
            <button :class="['pill-btn', { active: providerFilter === 'pending' }]" @click="providerFilter = 'pending'">待审核</button>
            <button :class="['pill-btn', { active: providerFilter === 'approved' }]" @click="providerFilter = 'approved'">已通过</button>
            <button :class="['pill-btn', { active: providerFilter === 'rejected' }]" @click="providerFilter = 'rejected'">已拒绝</button>
          </div>
        </div>

        <div v-if="providerLoading" class="loading-state">
          <span class="spinner"></span>
          <span>正在加载服务商申请…</span>
        </div>
        <div v-else-if="filteredProviders.length === 0" class="empty-state">
          <div class="empty-icon">🏭</div>
          <div>当前没有符合条件的服务商记录</div>
        </div>
        <div v-else class="entity-list">
          <article v-for="item in filteredProviders" :key="item.id" class="entity-card">
            <div class="entity-head">
              <div class="entity-main">
                <div class="entity-title-row">
                  <h3 class="entity-title">{{ item.name }}</h3>
                  <span :class="['status-badge', item.status]">{{ providerStatusLabel(item.status) }}</span>
                </div>
                <div class="entity-meta">
                  <span>{{ item.type }}</span>
                  <span class="dot">·</span>
                  <span>{{ item.province }} {{ item.city }}</span>
                  <span class="dot">·</span>
                  <span>{{ item.username }}</span>
                  <span class="dot">·</span>
                  <span>{{ timeAgo(item.createdAt) }}</span>
                </div>
              </div>
              <div class="entity-actions">
                <button class="action-btn approve" :disabled="providerActioningId === item.id" @click="setProviderStatus(item, 'approved')">通过</button>
                <button class="action-btn reject" :disabled="providerActioningId === item.id" @click="setProviderStatus(item, 'rejected')">拒绝</button>
                <button class="action-btn neutral" :disabled="providerActioningId === item.id" @click="setProviderStatus(item, 'pending')">退回待审</button>
                <button class="action-btn ghost" :disabled="providerActioningId === item.id" @click="deleteProvider(item)">删除</button>
              </div>
            </div>

            <div class="entity-detail-grid">
              <div class="detail-block">
                <span class="detail-label">擅长工艺</span>
                <p class="detail-text">{{ item.specialties.length ? item.specialties.join('、') : '未填写' }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">支持材料</span>
                <p class="detail-text">{{ item.materials.length ? item.materials.join('、') : '未填写' }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">联系方式</span>
                <p class="detail-text mono-text">微信：{{ item.wechat || '未填写' }}<br>电话：{{ item.phone || '未填写' }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">起订/周期</span>
                <p class="detail-text">{{ item.minOrder || '未填写' }} 件 · {{ item.leadTime || '未填写' }} · 价格 {{ item.priceRange || '未填写' }}</p>
              </div>
            </div>

            <div v-if="item.desc" class="detail-foot">{{ item.desc }}</div>
          </article>
        </div>
      </div>

      <div v-else-if="adminSection === 'users'">
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-num">{{ userStats.total }}</div>
            <div class="stat-label">用户总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-num approved-color">{{ userStats.active }}</div>
            <div class="stat-label">正常账号</div>
          </div>
          <div class="stat-card">
            <div class="stat-num rejected-color">{{ userStats.disabled }}</div>
            <div class="stat-label">已禁用</div>
          </div>
          <div class="stat-card">
            <div class="stat-num pending-color">{{ userStats.admins }}</div>
            <div class="stat-label">管理员</div>
          </div>
        </div>

        <div class="toolbar">
          <input v-model="userSearch" class="toolbar-search" placeholder="搜索用户名、UID、手机号..." />
          <div class="filter-pills">
            <button :class="['pill-btn', { active: userFilter === 'all' }]" @click="userFilter = 'all'">全部</button>
            <button :class="['pill-btn', { active: userFilter === 'active' }]" @click="userFilter = 'active'">正常</button>
            <button :class="['pill-btn', { active: userFilter === 'disabled' }]" @click="userFilter = 'disabled'">已禁用</button>
            <button :class="['pill-btn', { active: userFilter === 'admins' }]" @click="userFilter = 'admins'">管理员</button>
          </div>
        </div>

        <div v-if="usersLoading" class="loading-state">
          <span class="spinner"></span>
          <span>正在加载用户数据…</span>
        </div>
        <div v-else-if="filteredUserItems.length === 0" class="empty-state">
          <div class="empty-icon">👤</div>
          <div>当前没有符合条件的用户</div>
        </div>
        <div v-else class="entity-list">
          <article v-for="item in filteredUserItems" :key="item.id" class="entity-card">
            <div class="entity-head">
              <div class="entity-main">
                <div class="entity-title-row">
                  <div class="user-badge">{{ item.avatar }}</div>
                  <h3 class="entity-title">{{ item.username }}</h3>
                  <span :class="['status-badge', item.status === 'disabled' ? 'rejected' : 'published']">{{ userStatusLabel(item.status) }}</span>
                  <span v-if="item.isAdmin" class="mini-flag">管理员</span>
                </div>
                <div class="entity-meta">
                  <span>UID {{ item.uid }}</span>
                  <span class="dot">·</span>
                  <span>{{ item.phone }}</span>
                  <span class="dot">·</span>
                  <span>{{ item.latestActivity ? `${timeAgo(item.latestActivity)} 活跃` : '暂无活跃记录' }}</span>
                </div>
              </div>
              <div class="entity-actions">
                <button
                  class="action-btn ghost"
                  :disabled="userActioningId === item.id"
                  @click="openUserDetail(item)"
                >
                  查看详情
                </button>
                <button
                  class="action-btn neutral"
                  :disabled="userActioningId === item.id || item.isAdmin"
                  @click="updateUserRole(item, true)"
                >
                  设为管理员
                </button>
                <button
                  class="action-btn warn"
                  :disabled="userActioningId === item.id || !item.isAdmin"
                  @click="updateUserRole(item, false)"
                >
                  取消管理员
                </button>
                <button
                  class="action-btn reject"
                  :disabled="userActioningId === item.id || item.status === 'disabled'"
                  @click="updateUserStatus(item, 'disabled')"
                >
                  禁用
                </button>
                <button
                  class="action-btn approve"
                  :disabled="userActioningId === item.id || item.status === 'active'"
                  @click="updateUserStatus(item, 'active')"
                >
                  恢复
                </button>
                <button
                  class="action-btn ghost"
                  :disabled="userActioningId === item.id"
                  @click="deleteUser(item)"
                >
                  删除
                </button>
              </div>
            </div>

            <div class="entity-detail-grid">
              <div class="detail-block">
                <span class="detail-label">内容贡献</span>
                <p class="detail-text">投稿 {{ item.submissionCount }} · 需求 {{ item.marketCount }} · 评论/解答 {{ item.commentCount }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">互动数据</span>
                <p class="detail-text">收藏 {{ item.favoriteCount }} · 积分 {{ item.points }} · 总贡献 {{ item.totalContribution }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">权限状态</span>
                <p class="detail-text">{{ item.isAdmin ? '管理员账号' : '普通用户' }} · {{ userStatusLabel(item.status) }}</p>
              </div>
              <div class="detail-block">
                <span class="detail-label">最近活跃</span>
                <p class="detail-text">{{ item.latestActivity ? formatDateTime(item.latestActivity) : '暂无记录' }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else-if="adminSection === 'stats'">
        <div v-if="statsLoading" class="loading-state">
          <span class="spinner"></span>
          <span>正在统计平台数据…</span>
        </div>
        <template v-else>
          <div class="data-cards">
            <div class="data-card">
              <div class="data-num">{{ stats.users }}</div>
              <div class="data-label">注册用户</div>
            </div>
            <div class="data-card">
              <div class="data-num">{{ stats.posts }}</div>
              <div class="data-label">需求帖子</div>
            </div>
            <div class="data-card">
              <div class="data-num">{{ stats.comments }}</div>
              <div class="data-label">回答总数</div>
            </div>
            <div class="data-card">
              <div class="data-num">{{ stats.favorites }}</div>
              <div class="data-label">收藏总数</div>
            </div>
            <div class="data-card">
              <div class="data-num">{{ stats.submissions }}</div>
              <div class="data-label">用户投稿</div>
            </div>
            <div class="data-card">
              <div class="data-num">{{ stats.providers }}</div>
              <div class="data-label">服务商申请</div>
            </div>
          </div>

          <div class="trend-block">
            <div class="trend-head">近 7 天需求市场发帖量</div>
            <div class="trend-chart">
              <div v-for="item in trend" :key="item.day" class="bar-col">
                <span class="bar-num">{{ item.count > 0 ? item.count : '' }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ height: `${Math.max(item.pct, item.count > 0 ? 4 : 0)}%` }"></div>
                </div>
                <span class="bar-day">{{ item.day }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-else-if="adminSection === 'problems'">
        <div class="toolbar">
          <input v-model="imgSearch" class="toolbar-search" placeholder="搜索问题名称..." />
          <span class="toolbar-note">{{ filteredProblems.length }} / {{ allProblems.length }} 个问题，{{ Object.keys(metaMap).length }} 张已上传</span>
        </div>
        <div class="pi-grid">
          <div v-for="problem in filteredProblems" :key="problem.id" class="pi-card">
            <div class="pi-thumb" :style="{ background: problem.bgGradient }">
              <img v-if="metaMap[problem.id]?.image_url" :src="metaMap[problem.id].image_url" class="pi-img" />
              <span v-else class="pi-emoji">{{ problem.emoji }}</span>
              <div v-if="imgUploading[problem.id]" class="pi-loading">
                <span class="pi-spinner"></span>
              </div>
            </div>
            <div class="pi-info">
              <p class="pi-title">{{ problem.title }}</p>
              <p class="pi-cat">{{ problem.category }}</p>
            </div>
            <div class="pi-actions">
              <label class="pi-upload-btn" :class="{ disabled: imgUploading[problem.id] }">
                <input type="file" accept="image/*" style="display:none" :disabled="imgUploading[problem.id]" @change="handleImgUpload(problem, $event)" />
                {{ metaMap[problem.id]?.image_url ? '更换' : '上传' }}
              </label>
              <button v-if="metaMap[problem.id]?.image_url" class="pi-del-btn" @click="handleImgRemove(problem)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="drawer-fade">
      <div v-if="userDetailVisible" class="drawer-mask" @click.self="closeUserDetail">
        <aside class="detail-drawer">
          <div class="drawer-head">
            <div>
              <div class="drawer-kicker">用户详情</div>
              <h3 class="drawer-title">{{ userDetail?.profile?.username || '用户信息' }}</h3>
            </div>
            <button class="drawer-close" @click="closeUserDetail">✕</button>
          </div>

          <div v-if="userDetailLoading" class="loading-state">
            <span class="spinner"></span>
            <span>正在加载用户内容…</span>
          </div>

          <template v-else-if="userDetail">
            <div class="drawer-profile">
              <div class="user-badge large">{{ userDetail.profile.avatar }}</div>
              <div class="drawer-meta">
                <div class="drawer-meta-row">UID：{{ userDetail.uid }}</div>
                <div class="drawer-meta-row">手机号：{{ userDetail.profile.phone }}</div>
                <div class="drawer-meta-row">状态：{{ userStatusLabel(userDetail.profile.status) }} · {{ userDetail.profile.isAdmin ? '管理员' : '普通用户' }}</div>
                <div class="drawer-meta-row">最近活跃：{{ userDetail.profile.latestActivity ? formatDateTime(userDetail.profile.latestActivity) : '暂无记录' }}</div>
              </div>
            </div>

            <section class="drawer-section">
              <div class="drawer-section-title">投稿问题 {{ userDetail.problems.length }}</div>
              <div v-if="userDetail.problems.length" class="drawer-list">
                <article v-for="row in userDetail.problems" :key="row.id" class="drawer-item">
                  <div class="drawer-item-title">{{ row.title }}</div>
                  <div class="drawer-item-meta">{{ row.category }} · {{ row.status }} · {{ formatDateTime(row.createdAt) }}</div>
                </article>
              </div>
              <div v-else class="drawer-empty">暂无投稿</div>
            </section>

            <section class="drawer-section">
              <div class="drawer-section-title">需求市场 {{ userDetail.markets.length }}</div>
              <div v-if="userDetail.markets.length" class="drawer-list">
                <article v-for="row in userDetail.markets" :key="row.id" class="drawer-item">
                  <div class="drawer-item-title">{{ row.title }}</div>
                  <div class="drawer-item-meta">{{ row.category }} · {{ row.status }} · {{ formatDateTime(row.createdAt) }}</div>
                </article>
              </div>
              <div v-else class="drawer-empty">暂无需求</div>
            </section>

            <section class="drawer-section">
              <div class="drawer-section-title">问题评论 {{ userDetail.comments.length }}</div>
              <div v-if="userDetail.comments.length" class="drawer-list">
                <article v-for="row in userDetail.comments" :key="row.id" class="drawer-item">
                  <div class="drawer-item-body">{{ row.content }}</div>
                  <div class="drawer-item-meta">问题 ID：{{ row.problemId || '未知' }} · {{ formatDateTime(row.createdAt) }}</div>
                </article>
              </div>
              <div v-else class="drawer-empty">暂无评论</div>
            </section>

            <section class="drawer-section">
              <div class="drawer-section-title">社区方案 {{ userDetail.solutions.length }}</div>
              <div v-if="userDetail.solutions.length" class="drawer-list">
                <article v-for="row in userDetail.solutions" :key="row.id" class="drawer-item">
                  <div class="drawer-item-title">{{ row.title }}</div>
                  <div class="drawer-item-body">{{ row.detail }}</div>
                  <div class="drawer-item-meta">问题 ID：{{ row.problemId || '未知' }} · {{ formatDateTime(row.createdAt) }}</div>
                </article>
              </div>
              <div v-else class="drawer-empty">暂无方案</div>
            </section>
          </template>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(204, 225, 255, 0.7), transparent 36%),
    linear-gradient(180deg, #eef3f8 0%, #f7f8fb 48%, #f1f3f7 100%);
}

.admin-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(15, 24, 38, 0.08);
}

.back-btn,
.refresh-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: #5d6575;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.16s ease;
}

.back-btn:hover,
.refresh-btn:hover:not(:disabled) {
  color: #172033;
}

.refresh-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.admin-title {
  font-size: 15px;
  font-weight: 700;
  color: #172033;
}

.nav-section-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding: 4px;
  background: rgba(16, 24, 40, 0.06);
  border-radius: 12px;
  overflow-x: auto;
}

.nsec-btn {
  border: none;
  background: transparent;
  border-radius: 9px;
  padding: 7px 12px;
  white-space: nowrap;
  font-size: 13px;
  color: #667085;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.16s ease;
}

.nsec-btn.active {
  background: #fff;
  color: #172033;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.admin-content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 24px 72px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.section-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5274d9;
  margin-bottom: 8px;
}

.section-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.05;
  color: #172033;
}

.section-desc {
  margin: 8px 0 0;
  font-size: 14px;
  color: #667085;
}

.stat-cards,
.data-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.data-cards {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.stat-card,
.data-card {
  padding: 18px 18px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 24, 38, 0.06);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
}

.stat-num,
.data-num {
  font-size: 30px;
  line-height: 1;
  font-weight: 800;
  color: #172033;
  letter-spacing: -0.04em;
}

.stat-label,
.data-label {
  margin-top: 7px;
  font-size: 12px;
  color: #8f98a8;
}

.pending-color {
  color: #ef8f00;
}

.approved-color {
  color: #1e9d66;
}

.rejected-color {
  color: #db4d5c;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.toolbar-search {
  flex: 1;
  min-width: 240px;
  height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(15, 24, 38, 0.08);
  background: rgba(255, 255, 255, 0.92);
  color: #172033;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.toolbar-search:focus {
  border-color: rgba(82, 116, 217, 0.4);
  box-shadow: 0 0 0 4px rgba(82, 116, 217, 0.08);
}

.toolbar-note {
  font-size: 12px;
  color: #8f98a8;
}

.filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(15, 24, 38, 0.08);
  background: rgba(255, 255, 255, 0.88);
  color: #667085;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.16s ease;
}

.pill-btn.active {
  background: #172033;
  color: #fff;
  border-color: #172033;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 64px 20px;
  color: #667085;
  font-size: 14px;
}

.spinner,
.pi-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(15, 24, 38, 0.1);
  border-top-color: #172033;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinning {
  animation: spin 0.7s linear infinite;
}

.empty-icon {
  font-size: 34px;
}

.entity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entity-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(15, 24, 38, 0.06);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.entity-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 18px 14px;
}

.entity-main {
  flex: 1;
  min-width: 0;
}

.entity-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.entity-title {
  margin: 0;
  font-size: 18px;
  color: #172033;
}

.entity-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 12px;
  color: #6f7787;
}

.dot {
  color: #c4c8d0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.pending {
  background: rgba(239, 143, 0, 0.12);
  color: #b96d00;
}

.status-badge.published,
.status-badge.approved {
  background: rgba(30, 157, 102, 0.12);
  color: #16774d;
}

.status-badge.hidden {
  background: rgba(107, 114, 128, 0.12);
  color: #475467;
}

.status-badge.rejected {
  background: rgba(219, 77, 92, 0.12);
  color: #b42318;
}

.mini-flag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(82, 116, 217, 0.12);
  color: #3555b5;
  font-size: 11px;
  font-weight: 700;
}

.user-badge {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff8a5b 0%, #e05d5d 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(224, 93, 93, 0.22);
}

.user-badge.large {
  width: 52px;
  height: 52px;
  font-size: 20px;
}

.entity-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.16s ease;
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-btn.approve {
  background: rgba(30, 157, 102, 0.12);
  color: #16774d;
}

.action-btn.approve:hover:not(:disabled) {
  background: rgba(30, 157, 102, 0.2);
}

.action-btn.reject {
  background: rgba(219, 77, 92, 0.12);
  color: #b42318;
}

.action-btn.reject:hover:not(:disabled) {
  background: rgba(219, 77, 92, 0.2);
}

.action-btn.neutral {
  background: rgba(82, 116, 217, 0.12);
  color: #3555b5;
}

.action-btn.neutral:hover:not(:disabled) {
  background: rgba(82, 116, 217, 0.2);
}

.action-btn.warn {
  background: rgba(120, 129, 148, 0.14);
  color: #475467;
}

.action-btn.warn:hover:not(:disabled) {
  background: rgba(120, 129, 148, 0.22);
}

.action-btn.ghost {
  background: rgba(15, 24, 38, 0.06);
  color: #475467;
}

.action-btn.ghost:hover:not(:disabled) {
  background: rgba(15, 24, 38, 0.12);
}

.entity-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 0 18px 18px;
}

.detail-block {
  padding: 14px;
  border-radius: 14px;
  background: #f7f8fb;
  border: 1px solid rgba(15, 24, 38, 0.05);
}

.detail-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #8f98a8;
}

.detail-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #172033;
  white-space: pre-wrap;
  word-break: break-word;
}

.mono-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.detail-foot {
  padding: 0 18px 18px;
  font-size: 13px;
  line-height: 1.6;
  color: #475467;
}

.trend-block {
  padding: 20px 24px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(15, 24, 38, 0.06);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
}

.trend-head {
  margin-bottom: 18px;
  font-size: 14px;
  font-weight: 600;
  color: #172033;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 160px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.bar-num {
  min-height: 16px;
  font-size: 11px;
  color: #667085;
}

.bar-track {
  flex: 1;
  width: 100%;
  background: rgba(15, 24, 38, 0.06);
  border-radius: 8px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  min-height: 0;
  border-radius: 8px;
  background: linear-gradient(180deg, #5173d8 0%, #172033 100%);
  transition: height 0.5s ease;
}

.bar-day {
  font-size: 11px;
  color: #98a2b3;
}

.pi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}

.pi-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(15, 24, 38, 0.06);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
}

.pi-thumb {
  position: relative;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pi-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pi-emoji {
  font-size: 38px;
}

.pi-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 24, 38, 0.32);
}

.pi-info {
  padding: 14px 14px 10px;
}

.pi-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #172033;
}

.pi-cat {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8f98a8;
}

.pi-actions {
  display: flex;
  gap: 8px;
  padding: 0 14px 14px;
}

.pi-upload-btn,
.pi-del-btn {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.pi-upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(82, 116, 217, 0.12);
  color: #3555b5;
}

.pi-upload-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pi-del-btn {
  background: rgba(219, 77, 92, 0.12);
  color: #b42318;
}

.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 240;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: flex-end;
}

.detail-drawer {
  width: min(520px, 100vw);
  height: 100vh;
  background: #fff;
  box-shadow: -24px 0 48px rgba(15, 23, 42, 0.18);
  padding: 22px 20px 28px;
  overflow-y: auto;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.drawer-kicker {
  font-size: 12px;
  color: #8f98a8;
  margin-bottom: 6px;
}

.drawer-title {
  margin: 0;
  font-size: 24px;
  color: #172033;
}

.drawer-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(15, 24, 38, 0.06);
  color: #475467;
  font-size: 16px;
  cursor: pointer;
}

.drawer-profile {
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: #f7f8fb;
  border: 1px solid rgba(15, 24, 38, 0.06);
  margin-bottom: 18px;
}

.drawer-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.drawer-meta-row {
  font-size: 13px;
  line-height: 1.5;
  color: #475467;
  word-break: break-word;
}

.drawer-section {
  margin-bottom: 18px;
}

.drawer-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #172033;
  margin-bottom: 10px;
}

.drawer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-item {
  padding: 14px;
  border-radius: 14px;
  background: #f7f8fb;
  border: 1px solid rgba(15, 24, 38, 0.05);
}

.drawer-item-title {
  font-size: 14px;
  font-weight: 700;
  color: #172033;
  line-height: 1.5;
}

.drawer-item-body {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.65;
  color: #475467;
  white-space: pre-wrap;
  word-break: break-word;
}

.drawer-item-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #8f98a8;
  line-height: 1.5;
}

.drawer-empty {
  padding: 16px 14px;
  border-radius: 14px;
  background: #f7f8fb;
  border: 1px dashed rgba(15, 24, 38, 0.08);
  color: #8f98a8;
  font-size: 13px;
}

@keyframes drawerFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes drawerSlideIn {
  from { transform: translateX(24px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.22s ease;
}

.drawer-fade-enter-active .detail-drawer {
  animation: drawerSlideIn 0.22s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .data-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .entity-head {
    flex-direction: column;
  }

  .entity-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .admin-nav {
    height: auto;
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 12px 16px;
  }

  .nav-section-tabs {
    order: 3;
    width: 100%;
  }

  .admin-content {
    padding: 22px 16px 56px;
  }

  .section-title {
    font-size: 24px;
  }

  .stat-cards,
  .data-cards,
  .entity-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .stat-cards,
  .data-cards,
  .entity-detail-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-search {
    min-width: 0;
    width: 100%;
  }

  .entity-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
