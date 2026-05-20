/**
 * 按 problem_id 去重 problems 集合
 *
 * 规则：
 * - 相同 problem_id 只保留 1 条
 * - 优先保留 created_at / updated_at 较新的记录
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   export TARGET_ENV_ID=cloud1-d0gqkk2h2dea42d2b
 *   npm run dedupe:problems
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.TARGET_ENV_ID || process.env.VITE_TCB_ENV_ID || 'cloud1-d0gqkk2h2dea42d2b'
const PAGE_SIZE = 100

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法去重 problems 集合。')
  process.exit(1)
}

function getTimeValue(row) {
  const updated = row?.updated_at ? new Date(row.updated_at).getTime() : 0
  const created = row?.created_at ? new Date(row.created_at).getTime() : 0
  return Math.max(updated || 0, created || 0)
}

async function main() {
  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const all = []
  let offset = 0

  while (true) {
    const { data } = await db.collection('problems')
      .orderBy('problem_id', 'asc')
      .skip(offset)
      .limit(PAGE_SIZE)
      .get()

    const rows = data || []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  const groups = new Map()
  all.forEach((row) => {
    const key = row?.problem_id || row?._id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  let removed = 0
  let dedupedGroups = 0

  for (const [, rows] of groups) {
    if (rows.length <= 1) continue

    dedupedGroups += 1
    const sorted = rows.slice().sort((a, b) => getTimeValue(b) - getTimeValue(a))
    const keep = sorted[0]
    const duplicates = sorted.slice(1)

    for (const row of duplicates) {
      await db.collection('problems').doc(row._id).remove()
      removed += 1
    }

    console.log(`problem_id=${keep.problem_id} 保留 1 条，删除 ${duplicates.length} 条重复记录。`)
  }

  console.log(`去重完成：共扫描 ${all.length} 条，处理 ${dedupedGroups} 组重复 problem_id，删除 ${removed} 条。`)
}

main().catch((error) => {
  console.error('去重失败：', error)
  process.exit(1)
})
