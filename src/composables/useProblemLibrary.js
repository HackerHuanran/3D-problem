import { db, cmd } from '@/lib/tcb.js'
import { problems as builtInProblems } from '@/data/problems.js'
import { problemSummaries } from '@/data/problemSummaries.js'

const BUILTIN_DETAIL_BY_ID = new Map(builtInProblems.map((problem) => [problem.id, problem]))
const BUILTIN_SUMMARY_BY_ID = new Map(problemSummaries.map((problem) => [problem.id, problem]))
const REMOTE_PROBLEM_COLLECTION = 'problems'
let remoteCollectionSeeded = null
const remoteDetailCache = new Map()
const detailPromiseCache = new Map()
const searchCache = new Map()
const searchPromiseCache = new Map()

export function invalidateProblemLibraryCache(problemIds = []) {
  const ids = [...new Set((problemIds || []).filter(Boolean))]

  if (!ids.length) {
    remoteCollectionSeeded = null
    remoteDetailCache.clear()
    detailPromiseCache.clear()
    searchCache.clear()
    searchPromiseCache.clear()
    return
  }

  ids.forEach((id) => {
    remoteDetailCache.delete(id)
    detailPromiseCache.delete(id)
  })

  searchCache.clear()
  searchPromiseCache.clear()
}

function normalizeSummary(problem) {
  return {
    id: problem.id,
    video: problem.video || null,
    category: problem.category || '未分类',
    printerType: problem.printerType || null,
    stages: problem.stages || [],
    severity: problem.severity || 'common',
    materials: problem.materials || [],
    symptomTags: problem.symptomTags || [],
    estimatedTime: problem.estimatedTime || '',
    checkOrder: problem.checkOrder || '',
    firstAction: problem.firstAction || '',
    relatedIds: problem.relatedIds || [],
    commonMisdiagnosis: problem.commonMisdiagnosis || [],
    title: problem.title || '',
    subtitle: problem.subtitle || '',
    emoji: problem.emoji || '🔧',
    color: problem.color || '#ff6b6b',
    bgGradient: problem.bgGradient || 'linear-gradient(135deg,#1a0a0a,#2d0f0f)',
    difficulty: problem.difficulty || '常见',
    description: problem.description || '',
    causes: problem.causes || [],
    image_url: problem.image_url || null,
    searchText: problem.searchText || [
      problem.title,
      problem.subtitle,
      problem.description,
      ...(problem.causes || []),
    ].filter(Boolean).join(' '),
  }
}

function uniqueById(list) {
  const map = new Map()
  list.forEach((item) => {
    map.set(item.id, item)
  })
  return [...map.values()]
}

function printerMatches(problem, printerType) {
  if (printerType === '全部') return true
  if (printerType === 'SLA 光固化') return problem.printerType === 'SLA'
  if (printerType === 'FDM') return problem.printerType !== 'SLA'
  return true
}

function scoreSearch(problem, query) {
  if (!query) return 0
  const q = query.toLowerCase()
  let score = 0
  if (problem.title?.toLowerCase().includes(q)) score += 8
  if (problem.subtitle?.toLowerCase().includes(q)) score += 5
  if (problem.description?.toLowerCase().includes(q)) score += 3
  if (problem.causes?.some((cause) => cause.toLowerCase().includes(q))) score += 2
  if (problem.searchText?.toLowerCase().includes(q)) score += 1
  return score
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mapCloudProblem(doc) {
  const solutions = (doc.solutions || []).map((solution, index) => ({
    step: solution.step || index + 1,
    title: solution.title,
    detail: solution.detail,
    image_url: solution.image_url || null,
  }))

  return {
    id: doc.problem_id || doc.id || doc._id,
    video: doc.video || null,
    category: doc.category || '未分类',
    printerType: doc.printerType || null,
    stages: doc.stages || [],
    severity: doc.severity || 'common',
    materials: doc.materials || [],
    symptomTags: doc.symptomTags || [],
    estimatedTime: doc.estimatedTime || '',
    checkOrder: doc.checkOrder || '',
    firstAction: doc.firstAction || '',
    relatedIds: doc.relatedIds || [],
    commonMisdiagnosis: doc.commonMisdiagnosis || [],
    title: doc.title || '',
    subtitle: doc.subtitle || '',
    emoji: doc.emoji || '🔧',
    color: doc.color || '#ff6b6b',
    bgGradient: doc.bgGradient || 'linear-gradient(135deg,#1a0a0a,#2d0f0f)',
    difficulty: doc.difficulty || '常见',
    description: doc.description || '',
    causes: doc.causes || [],
    solutions,
    tips: doc.tips || '',
    image_url: doc.image_url || null,
    searchText: doc.search_text || [
      doc.title,
      doc.subtitle,
      doc.description,
      ...(doc.causes || []),
    ].filter(Boolean).join(' '),
  }
}

function remoteFdmFilter() {
  return cmd.or([
    { printerType: 'FDM' },
    { printerType: null },
    { printerType: cmd.exists(false) },
  ])
}

function buildRemoteWhere({
  query = '',
  category = '全部',
  printerType = '全部',
  showFavOnly = false,
  favoriteIds = [],
  problemIds = [],
}) {
  const filters = []

  filters.push(cmd.or([
    { source: cmd.neq('user_submitted') },
    { source: cmd.exists(false) },
    { source: 'user_submitted', status: 'published' },
  ]))

  if (showFavOnly) {
    if (!favoriteIds.length) return { impossible: true }
    filters.push({ problem_id: cmd.in(favoriteIds) })
  }

  if (problemIds?.length) filters.push({ problem_id: cmd.in(problemIds) })
  if (category !== '全部') filters.push({ category })

  if (printerType === 'SLA 光固化') filters.push({ printerType: 'SLA' })
  else if (printerType === 'FDM') filters.push(remoteFdmFilter())

  const trimmedQuery = query.trim()
  if (trimmedQuery) {
    filters.push({
      search_text: db.RegExp({
        regexp: escapeRegExp(trimmedQuery),
        options: 'i',
      }),
    })
  }

  if (!filters.length) return {}
  if (filters.length === 1) return filters[0]
  return cmd.and(filters)
}

function buildSearchCacheKey(params = {}) {
  const {
    page = 1,
    pageSize = 12,
    query = '',
    category = '全部',
    printerType = '全部',
    showFavOnly = false,
    favoriteIds = [],
    problemIds = [],
    orderedIds = [],
    extraItems = [],
  } = params

  return JSON.stringify({
    page,
    pageSize,
    query: query.trim(),
    category,
    printerType,
    showFavOnly,
    favoriteIds: [...favoriteIds].sort(),
    problemIds: [...problemIds].sort(),
    orderedIds: [...orderedIds],
    extraIds: extraItems.map(item => item.id).sort(),
  })
}

async function searchRemoteProblems(params = {}) {
  const {
    page = 1,
    pageSize = 12,
  } = params

  const where = buildRemoteWhere(params)
  if (where.impossible) {
    return { items: [], total: 0, page, pageSize, source: 'cloudbase' }
  }

  let countQuery = db.collection(REMOTE_PROBLEM_COLLECTION)
  let listQuery = db.collection(REMOTE_PROBLEM_COLLECTION)

  if (Object.keys(where).length) {
    countQuery = countQuery.where(where)
    listQuery = listQuery.where(where)
  }

  const [{ total }, { data }] = await Promise.all([
    countQuery.count(),
    listQuery
      .orderBy('problem_id', 'asc')
      .skip(Math.max(0, (page - 1) * pageSize))
      .limit(pageSize)
      .get(),
  ])

  return {
    items: data.map(mapCloudProblem),
    total,
    page,
    pageSize,
    source: 'cloudbase',
  }
}

async function getRemoteProblemDetail(problemId) {
  if (remoteDetailCache.has(problemId)) return remoteDetailCache.get(problemId)
  const { data } = await db.collection(REMOTE_PROBLEM_COLLECTION)
    .where({ problem_id: problemId })
    .limit(1)
    .get()

  if (!data?.length) return null
  const mapped = mapCloudProblem(data[0])
  remoteDetailCache.set(problemId, mapped)
  return mapped
}

async function getRemoteProblemDetailsBatch(problemIds) {
  const uniqueIds = [...new Set((problemIds || []).filter(Boolean))]
  const uncachedIds = uniqueIds.filter((id) => !remoteDetailCache.has(id))

  if (uncachedIds.length) {
    const { data } = await db.collection(REMOTE_PROBLEM_COLLECTION)
      .where({ problem_id: cmd.in(uncachedIds) })
      .limit(Math.max(uncachedIds.length, 1))
      .get()

    ;(data || []).forEach((doc) => {
      const mapped = mapCloudProblem(doc)
      remoteDetailCache.set(mapped.id, mapped)
    })
  }

  return uniqueIds
    .map((id) => remoteDetailCache.get(id))
    .filter(Boolean)
}

async function ensureRemoteCollectionSeeded() {
  if (remoteCollectionSeeded !== null) return remoteCollectionSeeded
  try {
    const { total } = await db.collection(REMOTE_PROBLEM_COLLECTION).count()
    remoteCollectionSeeded = total > 0
  } catch (error) {
    remoteCollectionSeeded = false
  }
  return remoteCollectionSeeded
}

function filterLocalProblems({
  query = '',
  category = '全部',
  printerType = '全部',
  showFavOnly = false,
  favoriteIds = [],
  problemIds = [],
  orderedIds = [],
  extraItems = [],
}) {
  const favorites = new Set(favoriteIds)
  const restrictIds = problemIds?.length ? new Set(problemIds) : null
  const orderMap = new Map((orderedIds || []).map((id, index) => [id, index]))
  const q = query.trim().toLowerCase()

  let list = uniqueById([
    ...extraItems.map(normalizeSummary),
    ...problemSummaries,
  ])

  if (restrictIds) list = list.filter((problem) => restrictIds.has(problem.id))
  if (showFavOnly) list = list.filter((problem) => favorites.has(problem.id))
  if (category !== '全部') list = list.filter((problem) => problem.category === category)
  if (printerType !== '全部') list = list.filter((problem) => printerMatches(problem, printerType))
  if (q) list = list.filter((problem) => problem.searchText.toLowerCase().includes(q))

  return list.sort((a, b) => {
    if (orderMap.size) {
      const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER
      const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
    }

    const scoreDiff = scoreSearch(b, q) - scoreSearch(a, q)
    if (scoreDiff !== 0) return scoreDiff

    return a.title.localeCompare(b.title, 'zh-CN')
  })
}

export async function searchProblemLibrary(params = {}) {
  const {
    page = 1,
    pageSize = 12,
  } = params
  const cacheKey = buildSearchCacheKey(params)

  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)
  if (searchPromiseCache.has(cacheKey)) return searchPromiseCache.get(cacheKey)

  const loadPromise = (async () => {
    try {
      const seeded = await ensureRemoteCollectionSeeded()
      if (!seeded) throw new Error('remote problems collection is empty')
      const result = await searchRemoteProblems(params)
      searchCache.set(cacheKey, result)
      return result
    } catch (error) {
      console.warn('[problem-library] remote search failed, fallback to static summary:', error?.message || error)
    }

    const list = filterLocalProblems(params)
    const safePage = Math.max(1, page)
    const start = (safePage - 1) * pageSize

    const result = {
      items: list.slice(start, start + pageSize),
      total: list.length,
      page: safePage,
      pageSize,
      source: 'static-summary',
    }
    searchCache.set(cacheKey, result)
    return result
  })()

  searchPromiseCache.set(cacheKey, loadPromise)
  try {
    return await loadPromise
  } finally {
    searchPromiseCache.delete(cacheKey)
  }
}

export async function getProblemDetail(problemId, { extraItems = [] } = {}) {
  const extraMatch = extraItems.find((problem) => problem.id === problemId)
  if (extraMatch) return extraMatch
  if (remoteDetailCache.has(problemId)) return remoteDetailCache.get(problemId)
  if (detailPromiseCache.has(problemId)) return detailPromiseCache.get(problemId)

  const loadPromise = (async () => {
    try {
      const seeded = await ensureRemoteCollectionSeeded()
      if (!seeded) throw new Error('remote problems collection is empty')
      const remoteProblem = await getRemoteProblemDetail(problemId)
      if (remoteProblem) return remoteProblem
    } catch (error) {
      console.warn('[problem-library] remote detail failed, fallback to static detail:', error?.message || error)
    }
    return BUILTIN_DETAIL_BY_ID.get(problemId) || null
  })()

  detailPromiseCache.set(problemId, loadPromise)
  try {
    return await loadPromise
  } finally {
    detailPromiseCache.delete(problemId)
  }
}

export async function getProblemDetailsBatch(problemIds, { extraItems = [] } = {}) {
  const uniqueIds = [...new Set((problemIds || []).filter(Boolean))]
  if (!uniqueIds.length) return []

  const extraMap = new Map(extraItems.map((problem) => [problem.id, problem]))
  const results = new Map()
  uniqueIds.forEach((id) => {
    if (extraMap.has(id)) results.set(id, extraMap.get(id))
    else if (remoteDetailCache.has(id)) results.set(id, remoteDetailCache.get(id))
  })

  const unresolvedIds = uniqueIds.filter((id) => !results.has(id))

  if (unresolvedIds.length) {
    try {
      const seeded = await ensureRemoteCollectionSeeded()
      if (seeded) {
        const remoteResults = await getRemoteProblemDetailsBatch(unresolvedIds)
        remoteResults.forEach((problem) => {
          results.set(problem.id, problem)
        })
      }
    } catch (error) {
      console.warn('[problem-library] remote batch detail failed, fallback to static detail:', error?.message || error)
    }
  }

  unresolvedIds.forEach((id) => {
    if (!results.has(id)) {
      const builtIn = BUILTIN_DETAIL_BY_ID.get(id)
      if (builtIn) results.set(id, builtIn)
    }
  })

  return uniqueIds
    .map((id) => results.get(id))
    .filter(Boolean)
}

export async function getRelatedProblemSummaries(problemId, { limit = 3, extraItems = [] } = {}) {
  const detail = await getProblemDetail(problemId, { extraItems })
  if (!detail) return []

  const list = uniqueById([
    ...extraItems.map(normalizeSummary),
    ...problemSummaries,
  ])

  return list
    .filter((problem) => problem.id !== problemId && problem.category === detail.category)
    .slice(0, limit)
}

export function getProblemSummaryById(problemId) {
  return BUILTIN_SUMMARY_BY_ID.get(problemId) || null
}

export function getAllProblemSummaries(extraItems = []) {
  return uniqueById([
    ...extraItems.map(normalizeSummary),
    ...problemSummaries,
  ])
}
