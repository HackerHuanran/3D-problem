import { ref } from 'vue'
import { db } from '@/lib/tcb.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkImage } from '@/lib/moderate.js'

// CloudBase CDN 永久地址（tcb.qcloud.la，不带签名，不会过期）
const CDN_BASE = import.meta.env.VITE_TCB_CDN_BASE || 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'
const PUBLIC_COVER_COLLECTION = 'problem_public_covers'
const PRIVATE_COVER_COLLECTION = 'problem_meta'

function cdnUrl(cloudPath) {
  const normalizedPath = String(cloudPath || '').replace(/^\/+/, '')
  return normalizedPath ? `${CDN_BASE}/${normalizedPath}` : ''
}

function normalizeImageUrl(value) {
  if (!value) return ''
  const url = String(value).trim()
  if (!url) return ''
  if (url.startsWith('cloud://')) {
    const match = url.match(/^cloud:\/\/[^/]+\/(.+)$/)
    return match ? cdnUrl(match[1]) : ''
  }
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  return cdnUrl(url)
}

const metaMap = ref({})
let fetched   = false
let fetchPromise = null

function normalizeRows(rows = []) {
  const map = {}
  ;(rows || []).forEach(r => {
    if (!r.problem_id) return
    let image_url = ''
    if (r.cloud_path) {
      image_url = cdnUrl(r.cloud_path)
    } else if (r.file_id) {
      const match = String(r.file_id).match(/^cloud:\/\/[^/]+\/(.+)$/)
      if (match) image_url = cdnUrl(match[1])
    }
    image_url = image_url || normalizeImageUrl(r.image_url)
    if (image_url) {
      map[r.problem_id] = { _id: r._id, file_id: r.file_id, cloud_path: r.cloud_path, image_url }
    }
  })
  return map
}

async function fetchProblemCoverCollection(collectionName) {
  try {
    const res = await db.collection(collectionName).limit(1000).get()
    if (res.code) {
      console.warn(`[useProblemMeta] ${collectionName} DB error:`, res.code, res.message)
      return {}
    }
    return normalizeRows(res.data || [])
  } catch (e) {
    console.warn(`[useProblemMeta] ${collectionName} fetch failed:`, e?.message, e)
    return {}
  }
}

async function fetchStaticProblemCovers() {
  try {
    const res = await fetch('/problem-covers.json', { cache: 'no-cache' })
    if (!res.ok) return {}
    const data = await res.json()
    const rows = Array.isArray(data) ? data : Object.entries(data || {}).map(([problem_id, value]) => ({
      problem_id,
      ...(typeof value === 'string' ? { image_url: value } : value),
    }))
    return normalizeRows(rows)
  } catch {
    return {}
  }
}

export function useProblemMeta() {

  const fetchProblemMeta = async (force = false) => {
    if (fetched && !force) return metaMap.value
    if (fetchPromise && !force) return fetchPromise
    fetched = true
    fetchPromise = (async () => {
      const staticMap = await fetchStaticProblemCovers()
      if (Object.keys(staticMap).length) metaMap.value = { ...metaMap.value, ...staticMap }

      try {
        const publicMap = await fetchProblemCoverCollection(PUBLIC_COVER_COLLECTION)
        if (Object.keys(publicMap).length) metaMap.value = { ...metaMap.value, ...publicMap }

        const privateMap = await fetchProblemCoverCollection(PRIVATE_COVER_COLLECTION)
        if (Object.keys(privateMap).length) metaMap.value = { ...metaMap.value, ...privateMap }

        return metaMap.value
      } finally {
        fetchPromise = null
      }
    })()

    return fetchPromise
  }

  const uploadProblemImage = async (problemId, file) => {
    const compressed = await compressImage(file)
    const { pass, msg } = await checkImage(compressed)
    if (!pass) throw new Error(msg)

    const cloudPath = `problem-covers/${problemId}/${Date.now()}.jpg`
    const { fileID } = await app.uploadFile({ cloudPath, filePath: compressed })
    // 永久 CDN 直链，不依赖 getTempFileURL，不会过期
    const image_url = cdnUrl(cloudPath)

    const existing = metaMap.value[problemId]
    if (existing?._id) {
      await db.collection(PRIVATE_COVER_COLLECTION).doc(existing._id).update({ file_id: fileID, cloud_path: cloudPath, image_url })
    } else {
      const { id } = await db.collection(PRIVATE_COVER_COLLECTION).add({ problem_id: problemId, file_id: fileID, cloud_path: cloudPath, image_url })
      metaMap.value = { ...metaMap.value, [problemId]: { _id: id, file_id: fileID, cloud_path: cloudPath, image_url } }
      return image_url
    }
    metaMap.value = { ...metaMap.value, [problemId]: { ...existing, file_id: fileID, cloud_path: cloudPath, image_url } }
    return image_url
  }

  const removeProblemImage = async (problemId) => {
    const existing = metaMap.value[problemId]
    if (!existing?._id) return
    await db.collection(PRIVATE_COVER_COLLECTION).doc(existing._id).remove()
    const next = { ...metaMap.value }
    delete next[problemId]
    metaMap.value = next
  }

  const upsertPublicProblemImage = async (problemId, image_url, extra = {}) => {
    const payload = {
      problem_id: problemId,
      image_url: normalizeImageUrl(image_url),
      cloud_path: extra.cloud_path || '',
      file_id: extra.file_id || '',
      updated_at: new Date(),
    }
    const { data } = await db.collection(PUBLIC_COVER_COLLECTION).where({ problem_id: problemId }).limit(1).get()
    if (data?.length) {
      await db.collection(PUBLIC_COVER_COLLECTION).doc(data[0]._id).update(payload)
    } else {
      await db.collection(PUBLIC_COVER_COLLECTION).add({
        ...payload,
        created_at: new Date(),
      })
    }
  }

  const removePublicProblemImage = async (problemId) => {
    const { data } = await db.collection(PUBLIC_COVER_COLLECTION).where({ problem_id: problemId }).limit(1).get()
    if (!data?.length) return
    await db.collection(PUBLIC_COVER_COLLECTION).doc(data[0]._id).remove()
  }

  return {
    metaMap,
    fetchProblemMeta,
    uploadProblemImage,
    removeProblemImage,
    upsertPublicProblemImage,
    removePublicProblemImage,
  }
}
