/**
 * 同步问题公开封面索引到 problem_public_covers 集合
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   node scripts/sync-problem-public-covers.cjs
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'problem-d1gg06meg3dd7da6b'
const CDN_BASE = process.env.VITE_TCB_CDN_BASE || 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'
const PUBLIC_COLLECTION = 'problem_public_covers'
const PRIVATE_COLLECTION = 'problem_meta'
const PROBLEM_COLLECTION = 'problems'

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

function toProblemImageUrl(row = {}) {
  if (row.cloud_path) return cdnUrl(row.cloud_path)
  if (row.file_id) {
    const match = String(row.file_id).match(/^cloud:\/\/[^/]+\/(.+)$/)
    if (match) return cdnUrl(match[1])
  }
  return normalizeImageUrl(row.image_url)
}

async function main() {
  if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
    console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法同步公开封面索引。')
    process.exit(1)
  }

  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const [metaRes, problemRes, publicRes] = await Promise.all([
    db.collection(PRIVATE_COLLECTION).limit(1000).get(),
    db.collection(PROBLEM_COLLECTION).limit(1000).get(),
    db.collection(PUBLIC_COLLECTION).limit(1000).get().catch(() => ({ data: [] })),
  ])

  const coverMap = new Map()
  ;(problemRes.data || []).forEach((row) => {
    if (!row?.problem_id) return
    const imageUrl = normalizeImageUrl(row.image_url)
    if (!imageUrl) return
    coverMap.set(row.problem_id, {
      problem_id: row.problem_id,
      image_url: imageUrl,
      cloud_path: '',
      file_id: '',
    })
  })

  ;(metaRes.data || []).forEach((row) => {
    if (!row?.problem_id) return
    const imageUrl = toProblemImageUrl(row)
    if (!imageUrl) return
    coverMap.set(row.problem_id, {
      problem_id: row.problem_id,
      image_url: imageUrl,
      cloud_path: row.cloud_path || '',
      file_id: row.file_id || '',
    })
  })

  const existingMap = new Map((publicRes.data || []).map((row) => [row.problem_id, row]))

  let created = 0
  let updated = 0
  let skipped = 0

  for (const [problemId, row] of coverMap.entries()) {
    const existing = existingMap.get(problemId)
    const payload = {
      problem_id: problemId,
      image_url: row.image_url,
      cloud_path: row.cloud_path,
      file_id: row.file_id,
      updated_at: new Date(),
    }

    if (!existing) {
      await db.collection(PUBLIC_COLLECTION).add({
        ...payload,
        created_at: new Date(),
      })
      created += 1
      continue
    }

    if (
      existing.image_url === payload.image_url &&
      (existing.cloud_path || '') === payload.cloud_path &&
      (existing.file_id || '') === payload.file_id
    ) {
      skipped += 1
      continue
    }

    await db.collection(PUBLIC_COLLECTION).doc(existing._id).update(payload)
    updated += 1
  }

  console.log(`公开封面索引同步完成：新增 ${created} 条，更新 ${updated} 条，跳过 ${skipped} 条，总计 ${coverMap.size} 条。`)
}

main().catch((error) => {
  console.error('同步失败：', error)
  process.exit(1)
})
