import {
  BUILTIN_DETAIL_BY_ID,
  filterLocalProblems,
  getAllSharedProblemSummaries,
  mapCloudProblem,
  problemPrinterMatches,
} from '../../../../packages/shared/problems/library.js'
import { db } from './cloudbase.js'

function rankByStage(problem, stageId = '') {
  if (!stageId) return 0
  const stages = Array.isArray(problem.stages) ? problem.stages : []
  return stages.includes(stageId) ? 10 : 0
}

function rankByMaterial(problem, material = 'any') {
  if (!material || material === 'any') return 0
  const materials = Array.isArray(problem.materials) ? problem.materials : []
  if (materials.includes('any')) return 2
  return materials.includes(material) ? 8 : 0
}

function rankByPrinter(problem, printer = 'all') {
  if (!printer || printer === 'all') return 0
  return problemPrinterMatches(problem, printer === 'SLA' ? 'SLA 光固化' : printer) ? 6 : 0
}

export function getMiniappCategories() {
  return ['全部', ...new Set(getAllSharedProblemSummaries().map((item) => item.category).filter(Boolean))]
}

export function listMiniappProblems(params = {}) {
  return filterLocalProblems(params)
}

export async function listMiniappProblemsRemote({
  page = 1,
  pageSize = 20,
  query = '',
  category = '全部',
} = {}) {
  let where = {}

  if (category !== '全部') where = { ...where, category }

  let collection = db.collection('problems')

  if (Object.keys(where).length) collection = collection.where(where)

  const { data } = await collection
    .orderBy('problem_id', 'asc')
    .skip(Math.max(0, (page - 1) * pageSize))
    .limit(pageSize)
    .get()

  const mapped = (data || []).map(mapCloudProblem)
  const q = query.trim().toLowerCase()

  if (!q) return mapped

  return mapped.filter((problem) =>
    [problem.title, problem.subtitle, problem.description, problem.searchText]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(q)),
  )
}

export function paginateMiniappProblems(params = {}) {
  const {
    page = 1,
    pageSize = 12,
  } = params

  const list = listMiniappProblems(params)
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || 12)
  const start = (safePage - 1) * safePageSize

  return {
    total: list.length,
    page: safePage,
    pageSize: safePageSize,
    items: list.slice(start, start + safePageSize),
  }
}

export function getMiniappProblemDetail(problemId) {
  return BUILTIN_DETAIL_BY_ID.get(problemId) || null
}

export async function getMiniappProblemDetailRemote(problemId) {
  if (!problemId) return null
  const { data } = await db.collection('problems')
    .where({ problem_id: problemId })
    .limit(1)
    .get()
  if (!data?.length) return getMiniappProblemDetail(problemId)
  return mapCloudProblem(data[0])
}

export function getMiniappRelatedProblems(problemId, limit = 4) {
  const detail = getMiniappProblemDetail(problemId)
  if (!detail) return []

  return getAllSharedProblemSummaries()
    .filter((item) => item.id !== problemId && item.category === detail.category)
    .slice(0, limit)
}

export function getMiniappDiagnosisCandidates({
  stageId = '',
  printer = 'all',
  material = 'any',
  limit = 8,
} = {}) {
  return getAllSharedProblemSummaries()
    .map((problem) => ({
      ...problem,
      _score: rankByStage(problem, stageId) + rankByPrinter(problem, printer) + rankByMaterial(problem, material),
    }))
    .filter((problem) => problem._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}
