const db = wx.cloud.database()

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
    searchText: doc.search_text || [
      doc.title,
      doc.subtitle,
      doc.description,
      ...(doc.causes || []),
    ].filter(Boolean).join(' '),
  }
}

async function listProblems({ query = '', category = '全部', page = 1, pageSize = 20 } = {}) {
  let collection = db.collection('problems')

  if (category !== '全部') {
    collection = collection.where({ category })
  }

  const { data } = await collection
    .orderBy('problem_id', 'asc')
    .skip(Math.max(0, (page - 1) * pageSize))
    .limit(pageSize)
    .get()

  const mapped = (data || []).map(mapProblem)
  const q = String(query || '').trim().toLowerCase()

  if (!q) return mapped

  return mapped.filter((item) =>
    [item.title, item.subtitle, item.description, item.searchText]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(q)),
  )
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

    if (data && data.length) return mapProblem(data[0])
  }

  try {
    const res = await db.collection('problems').doc(problemId).get()
    if (res?.data) return mapProblem(res.data)
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
  getProblemDetail,
  getRelatedProblems,
  getDiagnosisCandidates,
}
