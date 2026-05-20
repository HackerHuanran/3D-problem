import { getBuiltInProblemDetails, getBuiltInProblemSummaries } from '../models/problems.js'

const builtInProblems = getBuiltInProblemDetails()
const builtInSummaries = getBuiltInProblemSummaries()

export const BUILTIN_DETAIL_BY_ID = new Map(builtInProblems.map((problem) => [problem.id, problem]))
export const BUILTIN_SUMMARY_BY_ID = new Map(builtInSummaries.map((problem) => [problem.id, problem]))

export function normalizeProblemSummary(problem) {
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

export function mapCloudProblem(doc) {
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

export function uniqueProblemsById(list) {
  const map = new Map()
  list.forEach((item) => {
    map.set(item.id, item)
  })
  return [...map.values()]
}

export function problemPrinterMatches(problem, printerType) {
  if (printerType === '全部') return true
  if (printerType === 'SLA 光固化') return problem.printerType === 'SLA'
  if (printerType === 'FDM') return problem.printerType !== 'SLA'
  return true
}

export function scoreProblemSearch(problem, query) {
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

export function escapeProblemSearchRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildSearchCacheKey(params = {}) {
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

export function filterLocalProblems({
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

  let list = uniqueProblemsById([
    ...extraItems.map(normalizeProblemSummary),
    ...builtInSummaries,
  ])

  if (restrictIds) list = list.filter((problem) => restrictIds.has(problem.id))
  if (showFavOnly) list = list.filter((problem) => favorites.has(problem.id))
  if (category !== '全部') list = list.filter((problem) => problem.category === category)
  if (printerType !== '全部') list = list.filter((problem) => problemPrinterMatches(problem, printerType))
  if (q) list = list.filter((problem) => problem.searchText.toLowerCase().includes(q))

  return list.sort((a, b) => {
    if (orderMap.size) {
      const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER
      const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
    }

    const scoreDiff = scoreProblemSearch(b, q) - scoreProblemSearch(a, q)
    if (scoreDiff !== 0) return scoreDiff

    return a.title.localeCompare(b.title, 'zh-CN')
  })
}

export function getAllSharedProblemSummaries(extraItems = []) {
  return uniqueProblemsById([
    ...extraItems.map(normalizeProblemSummary),
    ...builtInSummaries,
  ])
}
