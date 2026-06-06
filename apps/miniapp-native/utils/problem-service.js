const db = wx.cloud.database()
// 小程序端数据库单次读取通常最多 20 条，搜索全量数据时必须按 20 条翻页。
const FETCH_BATCH_SIZE = 20
const DETAIL_CACHE_KEY = 'problem_detail_cache_v1'
const COUNT_CACHE_KEY = 'problem_count_cache_v1'
const LIST_CACHE_KEY = 'problem_list_cache_v2_title_only'
const PUBLIC_URL_CACHE_KEY = 'problem_public_url_cache_v1'
const META_CACHE_KEY = 'problem_meta_image_cache_v1'
const THUMB_CACHE_KEY = 'problem_thumb_url_cache_v1'
const DETAIL_CACHE_TTL = 10 * 60 * 1000
const COUNT_CACHE_TTL = 5 * 60 * 1000
const LIST_CACHE_TTL = 3 * 60 * 1000
const PUBLIC_URL_CACHE_TTL = 2 * 60 * 60 * 1000
const META_CACHE_TTL = 30 * 60 * 1000
const THUMB_CACHE_TTL = 2 * 60 * 60 * 1000
const ISSUE_FALLBACK_IMAGES = [
  {
    image: '/images/problems/diyiceng.webp',
    patterns: [
      /warping|first-layer|bed-adhesion|bed-level|elephant-foot|z-offset|adhesion/i,
      /翘边|首层|粘床|第一层|调平|热床附着|象脚|z偏移|首层不稳/,
    ],
  },
  {
    image: '/images/problems/chaomian.jpg',
    patterns: [
      /stringing|spaghetti|ooze|blob|zit|curling/i,
      /拉丝|炒面|细丝|挂丝|糊料|垂料|毛边|拉花/,
    ],
  },
  {
    image: '/images/problems/zhicheng.png',
    patterns: [
      /support|overhang|bridge|bridging|sagging/i,
      /支撑|悬垂|拉桥|桥接|下垂|塌陷/,
    ],
  },
  {
    image: '/images/problems/Gemini_Generated_Image_uwubf7uwubf7uwub.png',
    patterns: [
      /no-extrusion|under-extrusion|clog|clogged|jam|extruder-clicking|grinding/i,
      /不出丝|欠挤出|堵嘴|堵头|卡料|挤出不足|打滑|断料|空打/,
    ],
  },
  {
    image: '/images/problems/du.webp',
    patterns: [
      /petg-nozzle-pickup|nozzle-pickup|pickup|oozing-nozzle|nozzle-build-up/i,
      /粘喷嘴|喷嘴挂料|喷嘴积料|喷嘴拖料|料堆在喷嘴上|petg/,
    ],
  },
  {
    image: '/images/problems/Gemini_Generated_Image_kjk6bgkjk6bgkjk6.png',
    patterns: [
      /ghosting|ringing|resonance|vibration|layer-shift|banding/i,
      /鬼影|振纹|振动纹|共振|层移|横纹|波纹/,
    ],
  },
]

const FALLBACK_IMAGE_BY_CATEGORY = {
  '材料': '/images/home/filament-library.jpg',
  '耗材材料': '/images/home/filament-library.jpg',
  'AMS送料': '/images/home/filament-library.jpg',
  '切片': '/images/home/knowledge-library.svg',
  '切片软件': '/images/home/knowledge-library.svg',
  '维护': '/images/home/knowledge-library.svg',
  '固件设置': '/images/home/knowledge-library.svg',
}

function safeGetStorage(key) {
  try {
    return wx.getStorageSync(key) || null
  } catch (error) {
    return null
  }
}

function safeSetStorage(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (error) {
    console.warn('safeSetStorage failed', key, error)
  }
}

function safeRemoveStorage(key) {
  try {
    wx.removeStorageSync(key)
  } catch (error) {
    console.warn('safeRemoveStorage failed', key, error)
  }
}

function readCache(key) {
  const cache = safeGetStorage(key)
  return cache && typeof cache === 'object' ? cache : {}
}

function writeCache(key, value) {
  safeSetStorage(key, value)
}

function cacheProblemDetail(detail) {
  if (!detail?.id) return
  const cache = readCache(DETAIL_CACHE_KEY)
  cache[detail.id] = {
    ts: Date.now(),
    data: detail,
  }
  writeCache(DETAIL_CACHE_KEY, cache)
}

function readProblemDetailCache(problemId) {
  if (!problemId) return null
  const cache = readCache(DETAIL_CACHE_KEY)
  const entry = cache[problemId]
  if (!entry?.data || !entry?.ts) return null
  if (Date.now() - entry.ts > DETAIL_CACHE_TTL) {
    delete cache[problemId]
    writeCache(DETAIL_CACHE_KEY, cache)
    return null
  }
  return entry.data
}

function cacheProblemCount(count) {
  safeSetStorage(COUNT_CACHE_KEY, {
    ts: Date.now(),
    count,
  })
}

function readProblemCountCache() {
  const cache = safeGetStorage(COUNT_CACHE_KEY)
  if (!cache || typeof cache !== 'object') return null
  if (!cache.ts || Date.now() - cache.ts > COUNT_CACHE_TTL) return null
  return typeof cache.count === 'number' ? cache.count : null
}

function getListCacheKey({ query = '', category = '全部', page = 1, pageSize = 20, searchAll = false } = {}) {
  return [category, normalizeText(query), page, pageSize, searchAll ? 'all' : 'page'].join('|')
}

function readProblemListCache(options = {}) {
  const cache = readCache(LIST_CACHE_KEY)
  const key = getListCacheKey(options)
  const entry = cache[key]
  if (!entry?.data || !entry?.ts) return null
  if (Date.now() - entry.ts > LIST_CACHE_TTL) {
    delete cache[key]
    writeCache(LIST_CACHE_KEY, cache)
    return null
  }
  return entry.data
}

function cacheProblemList(options = {}, list = []) {
  const cache = readCache(LIST_CACHE_KEY)
  cache[getListCacheKey(options)] = {
    ts: Date.now(),
    data: list,
  }
  writeCache(LIST_CACHE_KEY, cache)
}

function clearProblemCache(problemId = '') {
  if (!problemId) return
  const cache = readCache(DETAIL_CACHE_KEY)
  if (cache[problemId]) {
    delete cache[problemId]
    writeCache(DETAIL_CACHE_KEY, cache)
  }
}

function clearProblemCaches() {
  safeRemoveStorage(DETAIL_CACHE_KEY)
  safeRemoveStorage(COUNT_CACHE_KEY)
  safeRemoveStorage(LIST_CACHE_KEY)
  safeRemoveStorage(PUBLIC_URL_CACHE_KEY)
  safeRemoveStorage(META_CACHE_KEY)
  safeRemoveStorage(THUMB_CACHE_KEY)
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function collectTextParts(value) {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return value.flatMap((item) => collectTextParts(item))
  if (typeof value === 'object') return Object.values(value).flatMap((item) => collectTextParts(item))
  return [String(value)]
}

function buildSearchCorpus(item = {}) {
  return normalizeText(collectTextParts([
    item.title,
    item.subtitle,
    item.description,
    item.category,
    item.printerType,
    item.difficulty,
    item.severity,
    item.estimatedTime,
    item.checkOrder,
    item.firstAction,
    item.tips,
    item.causes,
    item.solutions,
    item.materials,
    item.stages,
    item.symptomTags,
    item.commonMisdiagnosis,
    item.searchText,
  ]).join(' '))
}

function buildProblemSearchText(doc = {}) {
  const solutionTexts = (doc.solutions || []).flatMap((solution) => [
    solution?.title,
    solution?.detail,
  ])

  return [
    doc.title,
    doc.subtitle,
    doc.description,
    ...(doc.causes || []),
    ...(doc.tips ? [doc.tips] : []),
    doc.checkOrder,
    doc.firstAction,
    ...(doc.symptomTags || []),
    ...(doc.commonMisdiagnosis || []),
    ...solutionTexts,
  ].filter(Boolean).join(' ')
}

function inferFallbackProblemImage(item = {}) {
  const text = [
    item.id,
    item.title,
    item.subtitle,
    item.description,
    item.category,
    ...(item.causes || []),
    ...(item.symptomTags || []),
  ].filter(Boolean).join(' ')

  for (const entry of ISSUE_FALLBACK_IMAGES) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      return entry.image
    }
  }

  const category = String(item.category || '').trim()
  if (category && FALLBACK_IMAGE_BY_CATEGORY[category]) {
    return FALLBACK_IMAGE_BY_CATEGORY[category]
  }

  const corpus = buildSearchCorpus(item)
  if (/pla|petg|abs|asa|tpu|耗材|材料|ams/.test(corpus)) {
    return '/images/home/filament-library.jpg'
  }
  if (/切片|参数|维护|固件|校准|知识/.test(corpus)) {
    return '/images/home/knowledge-library.svg'
  }
  return '/images/home/problem-center.jpg'
}

async function resolvePublicUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw
  }

  const cachedUrls = readCache(PUBLIC_URL_CACHE_KEY)
  const cachedEntry = cachedUrls[raw]
  if (cachedEntry?.url && cachedEntry?.ts && Date.now() - cachedEntry.ts <= PUBLIC_URL_CACHE_TTL) {
    return cachedEntry.url
  }

  const fileList = []
  if (raw.startsWith('cloud://')) {
    fileList.push(raw)
  } else if (raw.startsWith('/')) {
    const envId = getApp()?.globalData?.envId || ''
    if (envId) {
      fileList.push(`cloud://${envId}${raw}`)
    }
  }

  if (fileList.length) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList })
      const tempUrl = res?.fileList?.[0]?.tempFileURL
      if (tempUrl) {
        cachedUrls[raw] = {
          ts: Date.now(),
          url: tempUrl,
        }
        writeCache(PUBLIC_URL_CACHE_KEY, cachedUrls)
        return tempUrl
      }
    } catch (error) {
      console.warn('resolvePublicUrl failed', error)
    }
  }

  return raw
}

function appendImageThumbParams(url = '', { width = 360, quality = 75 } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/images/')) return raw
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/imageMogr2|x-oss-process|x-cos-process/i.test(raw)) return raw
  const joiner = raw.includes('?') ? '&' : '?'
  return `${raw}${joiner}imageMogr2/thumbnail/${Math.max(1, Number(width) || 360)}x/interlace/1/quality/${Math.max(1, Math.min(100, Number(quality) || 75))}`
}

async function resolveProblemThumbUrl(imageUrl = '', { width = 360, quality = 75 } = {}) {
  const raw = String(imageUrl || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/images/')) return raw
  const cache = readCache(THUMB_CACHE_KEY)
  const cacheKey = `${raw}|${width}|${quality}`
  const cachedEntry = cache[cacheKey]
  if (cachedEntry?.url && cachedEntry?.ts && Date.now() - cachedEntry.ts <= THUMB_CACHE_TTL) {
    return cachedEntry.url
  }
  const thumbUrl = appendImageThumbParams(raw, { width, quality })
  cache[cacheKey] = {
    ts: Date.now(),
    url: thumbUrl || raw,
  }
  writeCache(THUMB_CACHE_KEY, cache)
  return thumbUrl || raw
}

function scoreProblemMatch(item, query) {
  const q = normalizeText(query)
  if (!q) return 0

  const title = normalizeText(item.title)
  if (title === q) return 120
  if (title.includes(q)) return 80
  return 0
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
    difficulty: doc.difficulty || '',
    severity: doc.severity || '',
    symptomTags: doc.symptomTags || doc.symptom_tags || [],
    checkOrder: doc.checkOrder || doc.check_order || '',
    firstAction: doc.firstAction || doc.first_action || '',
    commonMisdiagnosis: doc.commonMisdiagnosis || doc.common_misdiagnosis || [],
    image_url: doc.image_url || doc.cover_image || '',
    searchText: doc.search_text || buildProblemSearchText(doc),
  }
}

async function hydrateProblemImage(item) {
  if (!item) return item
  const directImage = await resolvePublicUrl(item.image_url)
  const metaImage = directImage ? '' : await getProblemMeta(item.id)
  const imageUrl = directImage || metaImage || inferFallbackProblemImage(item)
  const thumbUrl = await resolveProblemThumbUrl(imageUrl, { width: 360, quality: 72 })
  const hydrated = {
    ...item,
    image_url: imageUrl || '',
    thumb_url: thumbUrl || imageUrl || '',
  }
  cacheProblemDetail(hydrated)
  return hydrated
}

async function fetchProblemBatch({ category = '全部', skip = 0, limit = FETCH_BATCH_SIZE } = {}) {
  let collection = db.collection('problems')

  if (category !== '全部') {
    collection = collection.where({ category })
  }

  const { data } = await collection
    .orderBy('problem_id', 'asc')
    .skip(skip)
    .limit(limit)
    .get()

  return data || []
}

async function listProblems({ query = '', category = '全部', page = 1, pageSize = 20, searchAll = false } = {}) {
  const q = normalizeText(query)
  const cacheOptions = { query: q, category, page, pageSize, searchAll }
  const cachedList = readProblemListCache(cacheOptions)
  if (cachedList) return cachedList

  if (!q) {
    const data = await fetchProblemBatch({
      category,
      skip: Math.max(0, (page - 1) * pageSize),
      limit: pageSize,
    })
    const mapped = data.map(mapProblem)
    const list = await Promise.all(mapped.map((item) => hydrateProblemImage(item)))
    cacheProblemList(cacheOptions, list)
    return list
  }

  const allDocs = []
  let skip = 0

  while (true) {
    const batch = await fetchProblemBatch({
      category,
      skip,
      limit: FETCH_BATCH_SIZE,
    })
    if (!batch.length) break
    allDocs.push(...batch)
    if (batch.length < FETCH_BATCH_SIZE) break
    skip += batch.length
  }

  const matched = allDocs
    .map(mapProblem)
    .filter((item) => {
      return normalizeText(item.title).includes(q)
    })
    .map((item) => ({
      ...item,
      _matchScore: scoreProblemMatch(item, q),
    }))
    .sort((a, b) => {
      if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore
      return String(a.id).localeCompare(String(b.id))
    })

  const enriched = await Promise.all(matched.map((item) => hydrateProblemImage(item)))

  if (searchAll) {
    cacheProblemList(cacheOptions, enriched)
    return enriched
  }

  const start = Math.max(0, (page - 1) * pageSize)
  const list = enriched.slice(start, start + pageSize)
  cacheProblemList(cacheOptions, list)
  return list
}

async function getProblemCount() {
  const cachedCount = readProblemCountCache()
  if (typeof cachedCount === 'number') return cachedCount

  try {
    const res = await db.collection('problems').count()
    if (typeof res?.total === 'number') {
      cacheProblemCount(res.total)
      return res.total
    }
    if (typeof res?.count === 'number') {
      cacheProblemCount(res.count)
      return res.count
    }
  } catch (error) {
    console.warn('getProblemCount count() failed', error)
  }

  let total = 0
  let skip = 0

  while (true) {
    const batch = await fetchProblemBatch({
      skip,
      limit: FETCH_BATCH_SIZE,
    })
    total += batch.length
    if (batch.length < FETCH_BATCH_SIZE) break
    skip += batch.length
  }

  cacheProblemCount(total)
  return total
}

async function getProblemDetail(problemId) {
  if (!problemId) return null

  const cachedDetail = readProblemDetailCache(problemId)
  if (cachedDetail) return cachedDetail

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
      const item = mapProblem(data[0])
      const hydrated = await hydrateProblemImage(item)
      cacheProblemDetail(hydrated)
      return hydrated
    }
  }

  try {
    const res = await db.collection('problems').doc(problemId).get()
    if (res?.data) {
      const item = mapProblem(res.data)
      const hydrated = await hydrateProblemImage(item)
      cacheProblemDetail(hydrated)
      return hydrated
    }
  } catch (error) {
    console.warn('getProblemDetail by doc id failed', error)
  }

  return null
}

async function getProblemMeta(problemId) {
  if (!problemId) return ''
  const metaCache = readCache(META_CACHE_KEY)
  const cachedEntry = metaCache[problemId]
  if (cachedEntry?.ts && Date.now() - cachedEntry.ts <= META_CACHE_TTL) {
    return cachedEntry.imageUrl || ''
  }

  let imageUrl = ''
  try {
    const publicRes = await db.collection('problem_public_covers').where({ problem_id: problemId }).limit(1).get()
    const publicMeta = publicRes?.data?.[0]
    if (publicMeta?.image_url) imageUrl = await resolvePublicUrl(publicMeta.image_url)
    else if (publicMeta?.cloud_path) imageUrl = await resolvePublicUrl(`/${publicMeta.cloud_path}`)
    else if (publicMeta?.file_id) imageUrl = await resolvePublicUrl(publicMeta.file_id)
  } catch (error) {
    console.warn('getProblemMeta public cover failed', error)
  }

  if (imageUrl) {
    metaCache[problemId] = { ts: Date.now(), imageUrl }
    writeCache(META_CACHE_KEY, metaCache)
    return imageUrl
  }

  try {
    const { data } = await db.collection('problem_meta').where({ problem_id: problemId }).limit(1).get()
    const meta = data?.[0]
    if (meta?.image_url) imageUrl = await resolvePublicUrl(meta.image_url)
    else if (meta?.cloud_path) imageUrl = await resolvePublicUrl(`/${meta.cloud_path}`)
    else if (meta?.file_id) imageUrl = await resolvePublicUrl(meta.file_id)
  } catch (error) {
    console.warn('getProblemMeta failed', error)
  }

  metaCache[problemId] = {
    ts: Date.now(),
    imageUrl: imageUrl || '',
  }
  writeCache(META_CACHE_KEY, metaCache)
  return imageUrl || ''
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
  getProblemCount,
  getProblemDetail,
  getRelatedProblems,
  getDiagnosisCandidates,
  clearProblemCache,
  clearProblemCaches,
  resolveProblemThumbUrl,
}
