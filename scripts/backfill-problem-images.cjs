/**
 * 把 problem_meta 中已有的封面图回填到 problems.image_url
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   node scripts/backfill-problem-images.cjs
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'problem-d1gg06meg3dd7da6b'
const CDN_BASE = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'

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
    console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法回填问题图片。')
    process.exit(1)
  }

  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const [{ data: metaRows }, { data: problemRows }] = await Promise.all([
    db.collection('problem_meta').limit(1000).get(),
    db.collection('problems').limit(1000).get(),
  ])

  const metaMap = new Map()
  ;(metaRows || []).forEach((row) => {
    if (!row?.problem_id) return
    const imageUrl = toProblemImageUrl(row)
    if (!imageUrl) return
    metaMap.set(row.problem_id, imageUrl)
  })

  let updated = 0
  let skipped = 0
  let missingMeta = 0

  for (const row of problemRows || []) {
    const problemId = row.problem_id
    const nextImageUrl = metaMap.get(problemId)
    if (!nextImageUrl) {
      missingMeta += 1
      continue
    }
    if (row.image_url === nextImageUrl) {
      skipped += 1
      continue
    }
    await db.collection('problems').doc(row._id).update({
      image_url: nextImageUrl,
      updated_at: new Date(),
    })
    updated += 1
  }

  console.log(`回填完成：更新 ${updated} 条，已一致跳过 ${skipped} 条，缺少 meta 图片 ${missingMeta} 条。`)
}

main().catch((error) => {
  console.error('回填失败：', error)
  process.exit(1)
})
