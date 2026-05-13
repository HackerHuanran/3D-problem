import { ref } from 'vue'
import { app, db } from '@/lib/tcb.js'

// 模块级单例，ProblemsView 和 ProblemDetailView 共享同一份数据
const userProblems = ref([])

const CAT_META = {
  '打印机整机': { color: '#74b9ff', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1a2d 100%)', emoji: '🖨️' },
  '喷头热端':   { color: '#ff7675', bg: 'linear-gradient(135deg,#1a0a0a 0%,#2d1010 100%)', emoji: '🔥' },
  '挤出机':     { color: '#b2bec3', bg: 'linear-gradient(135deg,#0f1214 0%,#1a1e22 100%)', emoji: '⚙️' },
  '热床':       { color: '#fd79a8', bg: 'linear-gradient(135deg,#1a0a12 0%,#2d0f1e 100%)', emoji: '🛏️' },
  'AMS送料':    { color: '#a29bfe', bg: 'linear-gradient(135deg,#0f0a1a 0%,#1a0f2d 100%)', emoji: '🎡' },
  '耗材材料':   { color: '#fdcb6e', bg: 'linear-gradient(135deg,#1a160a 0%,#2d230f 100%)', emoji: '🧵' },
  '切片软件':   { color: '#00cec9', bg: 'linear-gradient(135deg,#0a1a1a 0%,#0f2d2d 100%)', emoji: '✂️' },
  '校准调平':   { color: '#0984e3', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1e2d 100%)', emoji: '📐' },
  '打印质量':   { color: '#e17055', bg: 'linear-gradient(135deg,#1a120a 0%,#2d1e0f 100%)', emoji: '🎨' },
  '固件设置':   { color: '#55efc4', bg: 'linear-gradient(135deg,#0a1a14 0%,#0f2d1e 100%)', emoji: '⚡' },
}

const CDN_BASE = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'
const REMOTE_PROBLEM_COLLECTION = 'problems'
let fetchAllPromise = null
let fetchedAll = false
const myProblemCountCache = new Map()

// cloud:// fileID 转永久 CDN URL
function toCdnUrl(val) {
  if (!val) return null
  if (val.startsWith('cloud://')) {
    const m = val.match(/^cloud:\/\/[^/]+\/(.+)$/)
    return m ? `${CDN_BASE}/${m[1]}` : val
  }
  return val  // 已经是 HTTP URL，直接用
}

// 兼容旧数据：把 cloud:// fileID 转为永久 CDN URL（新数据已直接存 HTTP URL）
function resolveTempURLs(data) {
  return data.map(p => ({
    ...p,
    image_url: toCdnUrl(p.image_url),
    solutions: (p.solutions || []).map(s => ({ ...s, image_url: toCdnUrl(s.image_url) })),
  }))
}

function mapDoc(p) {
  const meta = CAT_META[p.category] || { color: '#ff6b6b', bg: 'linear-gradient(135deg,#1a0a0a,#2d0f0f)', emoji: '🔧' }
  return {
    id:          p._id,
    problemId:   p.problem_id || p._id,
    status:      p.status || 'pending',
    category:    p.category,
    title:       p.title,
    subtitle:    p.subtitle,
    emoji:       meta.emoji,
    images:      p.image_url || null,
    image_url:   p.image_url || null,
    color:       meta.color,
    bgGradient:  meta.bg,
    difficulty:  p.difficulty,
    description: p.description,
    causes:      p.causes    || [],
    solutions:   (p.solutions || []).map((s, i) => ({ step: i + 1, title: s.title, detail: s.detail, image_url: s.image_url || null })),
    tips:        p.tips || '',
    isUserSubmitted: true,
  }
}

function buildProblemSearchText({ title, subtitle, description, causes }) {
  return [title, subtitle, description, ...(causes || [])].filter(Boolean).join(' ')
}

function buildProblemLibraryDoc(problemId, { category, difficulty, title, subtitle, description, causes, solutions, tips, image_url }) {
  const meta = CAT_META[category] || { color: '#ff6b6b', bg: 'linear-gradient(135deg,#1a0a0a,#2d0f0f)', emoji: '🔧' }
  const safeCauses = (causes || []).filter(c => c.trim())
  const safeSolutions = (solutions || [])
    .filter(s => s.title.trim())
    .map((s, i) => ({
      step: i + 1,
      title: s.title,
      detail: s.detail,
      image_url: s.image_url || null,
    }))

  return {
    problem_id: problemId,
    status: 'published',
    category,
    printerType: null,
    difficulty,
    title,
    subtitle,
    description,
    causes: safeCauses,
    solutions: safeSolutions,
    tips: tips.trim(),
    image_url: image_url || null,
    video: null,
    emoji: meta.emoji,
    color: meta.color,
    bgGradient: meta.bg,
    search_text: buildProblemSearchText({ title, subtitle, description, causes: safeCauses }),
    source: 'user_submitted',
    updated_at: new Date(),
  }
}

async function upsertProblemLibraryDoc(problemId, payload) {
  const collection = db.collection(REMOTE_PROBLEM_COLLECTION)
  const { data: existing } = await collection.where({ problem_id: problemId }).limit(1).get()
  if (existing?.length) {
    await collection.doc(existing[0]._id).update(payload)
    return existing[0]._id
  }
  const { id } = await collection.add({
    ...payload,
    created_at: new Date(),
  })
  return id
}

export function useUserProblems() {
  const loading = ref(false)
  const error   = ref(null)

  const fetchUserProblems = async () => {
    if (fetchedAll && !loading.value) return userProblems.value
    if (fetchAllPromise) return fetchAllPromise
    loading.value = true
    error.value   = null
    fetchAllPromise = (async () => {
      try {
        const { data } = await db.collection('user_problems')
          .orderBy('created_at', 'desc')
          .limit(200)
          .get()

        const resolved = resolveTempURLs(data)
        userProblems.value = resolved.map(mapDoc)
        fetchedAll = true
        return userProblems.value
      } catch (e) {
        error.value = e.message
        return userProblems.value
      } finally {
        loading.value = false
        fetchAllPromise = null
      }
    })()
    return fetchAllPromise
  }

  const submitProblem = async (userId, username, { category, difficulty, title, subtitle, description, causes, solutions, tips, image_url }) => {
    const problemId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const payload = {
      problem_id: problemId,
      status: 'pending',
      category, difficulty, title, subtitle, description,
      image_url: image_url || null,
      causes:    causes.filter(c => c.trim()),
      solutions: solutions.filter(s => s.title.trim()),
      tips:      tips.trim(),
      user_id:   userId,
      username,
      created_at: db.serverDate(),
    }

    await db.collection('user_problems').add(payload)
    fetchedAll = false
    await fetchUserProblems()
  }

  const fetchMyProblems = async (userId) => {
    loading.value = true
    error.value   = null
    try {
      const { data } = await db.collection('user_problems')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(200)
        .get()
      const resolved = resolveTempURLs(data)
      const rows = resolved.map(p => ({ ...mapDoc(p), _rawCreatedAt: p.created_at }))
      myProblemCountCache.set(userId, rows.length)
      return rows
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  const fetchMyProblemsCount = async (userId, { force = false } = {}) => {
    if (!userId) return 0
    if (!force && myProblemCountCache.has(userId)) return myProblemCountCache.get(userId)
    try {
      const { total } = await db.collection('user_problems')
        .where({ user_id: userId })
        .count()
      myProblemCountCache.set(userId, total || 0)
      return total || 0
    } catch (e) {
      error.value = e.message
      return myProblemCountCache.get(userId) || 0
    }
  }

  const deleteUserProblem = async (id) => {
    const target = userProblems.value.find(p => p.id === id)
    await db.collection('user_problems').doc(id).remove()
    if (target?.problemId) {
      const { data } = await db.collection(REMOTE_PROBLEM_COLLECTION).where({ problem_id: target.problemId }).limit(1).get()
      if (data?.length) await db.collection(REMOTE_PROBLEM_COLLECTION).doc(data[0]._id).remove()
    }
    userProblems.value = userProblems.value.filter(p => p.id !== id)
    if (target?.problemId && target?.userId) {
      myProblemCountCache.delete(target.userId)
    }
    fetchedAll = false
  }

  const updateUserProblem = async (id, { category, difficulty, title, subtitle, description, causes, solutions, tips, image_url }) => {
    const target = userProblems.value.find(p => p.id === id)
    await db.collection('user_problems').doc(id).update({
      category, difficulty, title, subtitle, description,
      image_url: image_url || null,
      causes:    causes.filter(c => c.trim()),
      solutions: solutions.filter(s => s.title.trim()),
      tips:      tips.trim(),
    })
    if (target?.problemId && target?.status === 'published') {
      await upsertProblemLibraryDoc(target.problemId, buildProblemLibraryDoc(target.problemId, { category, difficulty, title, subtitle, description, causes, solutions, tips, image_url }))
    }
    fetchedAll = false
    await fetchUserProblems()
  }

  return { userProblems, loading, error, fetchUserProblems, fetchMyProblems, fetchMyProblemsCount, submitProblem, deleteUserProblem, updateUserProblem }
}
