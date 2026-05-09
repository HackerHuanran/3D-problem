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

// 通用：把一批原始 doc 列表里的 cloud:// fileID 批量换成临时 URL
async function resolveTempURLs(data) {
  const fileIDs = []
  data.forEach(p => {
    if (p.image_url?.startsWith('cloud://')) fileIDs.push(p.image_url)
    p.solutions?.forEach(s => { if (s.image_url?.startsWith('cloud://')) fileIDs.push(s.image_url) })
  })
  const urlMap = {}
  if (fileIDs.length > 0) {
    const { fileList } = await app.getTempFileURL({ fileList: [...new Set(fileIDs)] })
    fileList.forEach(f => { urlMap[f.fileID] = f.tempFileURL })
  }
  return data.map(p => ({
    ...p,
    image_url: urlMap[p.image_url] ?? p.image_url ?? null,
    solutions: (p.solutions || []).map(s => ({ ...s, image_url: urlMap[s.image_url] ?? s.image_url ?? null })),
  }))
}

function mapDoc(p) {
  const meta = CAT_META[p.category] || { color: '#ff6b6b', bg: 'linear-gradient(135deg,#1a0a0a,#2d0f0f)', emoji: '🔧' }
  return {
    id:          p._id,
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

export function useUserProblems() {
  const loading = ref(false)
  const error   = ref(null)

  const fetchUserProblems = async () => {
    loading.value = true
    error.value   = null
    try {
      const { data } = await db.collection('user_problems')
        .orderBy('created_at', 'desc')
        .limit(200)
        .get()

      const resolved = await resolveTempURLs(data)
      userProblems.value = resolved.map(mapDoc)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const submitProblem = async (userId, username, { category, difficulty, title, subtitle, description, causes, solutions, tips, image_url }) => {
    await db.collection('user_problems').add({
      category, difficulty, title, subtitle, description,
      image_url: image_url || null,
      causes:    causes.filter(c => c.trim()),
      solutions: solutions.filter(s => s.title.trim()),
      tips:      tips.trim(),
      user_id:   userId,
      username,
      created_at: db.serverDate(),
    })
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
      const resolved = await resolveTempURLs(data)
      return resolved.map(p => ({ ...mapDoc(p), _rawCreatedAt: p.created_at }))
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  const deleteUserProblem = async (id) => {
    await db.collection('user_problems').doc(id).remove()
    userProblems.value = userProblems.value.filter(p => p.id !== id)
  }

  const updateUserProblem = async (id, { category, difficulty, title, subtitle, description, causes, solutions, tips, image_url }) => {
    await db.collection('user_problems').doc(id).update({
      category, difficulty, title, subtitle, description,
      image_url: image_url || null,
      causes:    causes.filter(c => c.trim()),
      solutions: solutions.filter(s => s.title.trim()),
      tips:      tips.trim(),
    })
    await fetchUserProblems()
  }

  return { userProblems, loading, error, fetchUserProblems, fetchMyProblems, submitProblem, deleteUserProblem, updateUserProblem }
}
