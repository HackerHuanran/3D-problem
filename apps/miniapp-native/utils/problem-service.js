const db = wx.cloud.database()
const PROBLEM_META_COLLECTION = 'problem_meta'

function uniqueProblemsById(list = []) {
  const map = new Map()
  list.forEach((item) => {
    const key = item?.id || item?.problem_id || item?.docId
    if (!key) return
    if (!map.has(key)) map.set(key, item)
  })
  return [...map.values()]
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

function buildSearchText(doc) {
  const solutionText = (doc.solutions || [])
    .map((solution) => [solution.title, solution.detail].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' ')

  return [
    doc.title,
    doc.subtitle,
    doc.description,
    doc.tips,
    doc.category,
    doc.printerType,
    ...(doc.causes || []),
    ...(doc.stages || []),
    ...(doc.materials || []),
    solutionText,
    doc.search_text,
  ]
    .filter(Boolean)
    .join(' ')
}

function mapProblem(doc) {
  const solutions = (doc.solutions || []).map((solution, index) => ({
    step: solution.step || index + 1,
    title: solution.title || '',
    detail: solution.detail || '',
    image_url: solution.image_url || '',
  }))

  return {
    id: doc.problem_id || doc.id || doc._id,
    docId: doc._id || '',
    category: doc.category || '未分类',
    printerType: doc.printerType || '',
    stages: doc.stages || [],
    materials: doc.materials || [],
    estimatedTime: doc.estimatedTime || '',
    title: doc.title || '',
    subtitle: doc.subtitle || '',
    description: doc.description || '',
    causes: doc.causes || [],
    solutions,
    tips: doc.tips || '',
    image_url: doc.image_url || '',
    searchText: doc.search_text || buildSearchText(doc),
  }
}

async function fetchProblemMetaMap() {
  const metaMap = {}
  const pageSize = 100
  let offset = 0
  const rawRows = []

  try {
    while (true) {
      const { data } = await db.collection(PROBLEM_META_COLLECTION)
        .orderBy('problem_id', 'asc')
        .skip(offset)
        .limit(pageSize)
        .get()

      const rows = data || []
      rawRows.push(...rows)

      if (rows.length < pageSize) break
      offset += pageSize
    }

    const fileIds = rawRows
      .map((row) => row?.file_id)
      .filter(Boolean)

    let tempUrlMap = {}
    if (fileIds.length) {
      try {
        const { fileList = [] } = await wx.cloud.getTempFileURL({
          fileList: [...new Set(fileIds)],
        })
        tempUrlMap = fileList.reduce((acc, item) => {
          if (item?.fileID && item?.tempFileURL) acc[item.fileID] = item.tempFileURL
          return acc
        }, {})
      } catch (tempError) {
        console.warn('getTempFileURL failed', tempError?.message || tempError)
      }
    }

    rawRows.forEach((row) => {
      if (!row?.problem_id) return
      const image_url = tempUrlMap[row.file_id] || row.image_url || ''
      if (image_url) metaMap[row.problem_id] = { ...row, image_url }
    })
  } catch (error) {
    console.warn('fetchProblemMetaMap failed', error?.message || error)
  }

  return metaMap
}

async function hydrateProblemImages(list = []) {
  try {
    const metaMap = await fetchProblemMetaMap()
    return list.map((item) => ({
      ...item,
      image_url: metaMap[item.id]?.image_url || item.image_url || '',
    }))
  } catch (error) {
    console.warn('hydrateProblemImages failed', error?.message || error)
    return list
  }
}

async function fetchAllProblems(category = '全部') {
  let collection = db.collection('problems')

  if (category !== '全部') {
    collection = collection.where({ category })
  }

  const pageSize = 20
  const all = []
  let offset = 0

  while (true) {
    const { data } = await collection
      .orderBy('problem_id', 'asc')
      .skip(offset)
      .limit(pageSize)
      .get()

    const rows = data || []
    all.push(...rows)
    if (rows.length < pageSize) break
    offset += pageSize
  }

  const hydrated = await hydrateProblemImages(all.map(mapProblem))
  return uniqueProblemsById(hydrated)
}

async function countProblems(category = '全部') {
  const problems = await fetchAllProblems(category)
  return problems.length
}

async function listProblems({ query = '', category = '全部', page = 1, pageSize = 20 } = {}) {
  const mapped = await fetchAllProblems(category)
  const q = normalizeText(query)

  if (q) {
    const scored = mapped
      .map((item) => {
        const title = normalizeText(item.title)
        const subtitle = normalizeText(item.subtitle)
        const description = normalizeText(item.description)
        const searchText = normalizeText(item.searchText)
        const tokens = q.split(/\s+/).filter(Boolean)
        const matchesAllTokens = tokens.length
          ? tokens.every((token) => searchText.includes(token))
          : searchText.includes(q)

        if (!matchesAllTokens) return null

        let score = 0
        if (title === q) score += 100
        else if (title.startsWith(q)) score += 90
        else if (title.includes(q)) score += 80

        if (subtitle.includes(q)) score += 60
        if (description.includes(q)) score += 40
        if (searchText.includes(q)) score += 20
        score += Math.max(0, 20 - item.title.length)

        return { ...item, _score: score }
      })
      .filter(Boolean)
      .sort((a, b) => b._score - a._score)

    return scored
  }

  const start = Math.max(0, (page - 1) * pageSize)
  return mapped.slice(start, start + pageSize)
}

async function getProblemDetail(problemId) {
  if (!problemId) return null

  const selectors = [
    { problem_id: problemId },
    { id: problemId },
  ]

  for (const where of selectors) {
    const { data } = await db.collection('problems')
      .where(where)
      .limit(1)
      .get()

    if (data && data.length) {
      const [hydrated] = await hydrateProblemImages([mapProblem(data[0])])
      return hydrated
    }
  }

  try {
    const res = await db.collection('problems').doc(problemId).get()
    if (res?.data) {
      const [hydrated] = await hydrateProblemImages([mapProblem(res.data)])
      return hydrated
    }
  } catch (error) {
    console.warn('getProblemDetail by doc id failed', error)
  }

  return null
}

async function getRelatedProblems(problem) {
  if (!problem?.category) return []
  const { data } = await db.collection('problems')
    .where({ category: problem.category })
    .limit(6)
    .get()

  return (data || [])
    .map(mapProblem)
    .filter((item) => item.id !== problem.id)
    .slice(0, 4)
}

async function getDiagnosisCandidates({ stageId = '', printer = 'all', material = 'any' } = {}) {
  const { data } = await db.collection('problems').limit(100).get()
  return (data || [])
    .map(mapProblem)
    .map((item) => {
      let score = 0
      if (stageId && (item.stages || []).includes(stageId)) score += 10
      if (printer !== 'all') {
        if (printer === 'SLA' ? item.printerType === 'SLA' : item.printerType !== 'SLA') score += 6
      }
      if (material !== 'any') {
        if ((item.materials || []).includes(material)) score += 8
      }
      return { ...item, _score: score }
    })
    .filter((item) => item._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 8)
}

module.exports = {
  listProblems,
  countProblems,
  getProblemDetail,
  getRelatedProblems,
  getDiagnosisCandidates,
}
