import { db, cmd } from '@/lib/tcb.js'
import {
  BUILTIN_DETAIL_BY_ID,
  BUILTIN_SUMMARY_BY_ID,
  normalizeProblemSummary,
  uniqueProblemsById,
  mapCloudProblem,
  escapeProblemSearchRegExp,
  buildSearchCacheKey,
  filterLocalProblems,
  getAllSharedProblemSummaries,
} from '../../packages/shared/problems/library.js'

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
        regexp: escapeProblemSearchRegExp(trimmedQuery),
        options: 'i',
      }),
    })
  }

  if (!filters.length) return {}
  if (filters.length === 1) return filters[0]
  return cmd.and(filters)
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

  const list = uniqueProblemsById([
    ...extraItems.map(normalizeProblemSummary),
    ...getAllSharedProblemSummaries(),
  ])

  return list
    .filter((problem) => problem.id !== problemId && problem.category === detail.category)
    .slice(0, limit)
}

export function getProblemSummaryById(problemId) {
  return BUILTIN_SUMMARY_BY_ID.get(problemId) || null
}

export function getAllProblemSummaries(extraItems = []) {
  return getAllSharedProblemSummaries(extraItems)
}
