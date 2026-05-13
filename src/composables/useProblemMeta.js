import { ref } from 'vue'
import { db } from '@/lib/tcb.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkImage } from '@/lib/moderate.js'

// CloudBase CDN 永久地址（tcb.qcloud.la，不带签名，不会过期）
const CDN_BASE = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'

function cdnUrl(cloudPath) {
  return `${CDN_BASE}/${cloudPath}`
}

const metaMap = ref({})
let fetched   = false
let fetchPromise = null

export function useProblemMeta() {

  const fetchProblemMeta = async (force = false) => {
    if (fetched && !force) return metaMap.value
    if (fetchPromise && !force) return fetchPromise
    fetched = true
    fetchPromise = (async () => {
      try {
        const res = await db.collection('problem_meta').limit(200).get()
        if (res.code) {
          console.warn('[useProblemMeta] DB error:', res.code, res.message)
          return metaMap.value
        }
        const data = res.data || []
        const map = {}
        data.forEach(r => {
          if (!r.problem_id) return
          let image_url = ''
          if (r.cloud_path) {
            image_url = cdnUrl(r.cloud_path)
          } else if (r.file_id) {
            const match = r.file_id.match(/^cloud:\/\/[^/]+\/(.+)$/)
            if (match) image_url = cdnUrl(match[1])
          }
          image_url = image_url || r.image_url || ''
          if (image_url) {
            map[r.problem_id] = { _id: r._id, file_id: r.file_id, cloud_path: r.cloud_path, image_url }
          }
        })
        metaMap.value = map
        return metaMap.value
      } catch (e) {
        console.warn('[useProblemMeta] fetch failed:', e?.message, e)
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
      await db.collection('problem_meta').doc(existing._id).update({ file_id: fileID, cloud_path: cloudPath, image_url })
    } else {
      const { id } = await db.collection('problem_meta').add({ problem_id: problemId, file_id: fileID, cloud_path: cloudPath, image_url })
      metaMap.value = { ...metaMap.value, [problemId]: { _id: id, file_id: fileID, cloud_path: cloudPath, image_url } }
      return
    }
    metaMap.value = { ...metaMap.value, [problemId]: { ...existing, file_id: fileID, cloud_path: cloudPath, image_url } }
  }

  const removeProblemImage = async (problemId) => {
    const existing = metaMap.value[problemId]
    if (!existing?._id) return
    await db.collection('problem_meta').doc(existing._id).remove()
    const next = { ...metaMap.value }
    delete next[problemId]
    metaMap.value = next
  }

  return { metaMap, fetchProblemMeta, uploadProblemImage, removeProblemImage }
}
