/**
 * 清理 `problems` 集合中不应公开展示的用户投稿
 *
 * 规则：
 * - 只处理 source = user_submitted 的记录
 * - 如果在 user_problems 中找不到对应 problem_id，删除
 * - 如果对应 user_problems.status 不是 published，删除
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   node scripts/cleanup-unpublished-user-problems.cjs
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'problem-d1gg06meg3dd7da6b'

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法清理 problems 集合。')
  process.exit(1)
}

async function main() {
  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const { data: libraryRows } = await db.collection('problems')
    .where({ source: 'user_submitted' })
    .limit(500)
    .get()

  let removed = 0
  let kept = 0

  for (const row of libraryRows || []) {
    const problemId = row.problem_id
    if (!problemId) continue

    const { data: userRows } = await db.collection('user_problems')
      .where({ problem_id: problemId })
      .limit(1)
      .get()

    const userProblem = userRows?.[0]
    const status = userProblem?.status || 'pending'

    if (!userProblem || status !== 'published') {
      await db.collection('problems').doc(row._id).remove()
      removed += 1
      continue
    }

    kept += 1
  }

  console.log(`清理完成：删除 ${removed} 条未审核/失效用户投稿，保留 ${kept} 条已发布投稿。`)
}

main().catch((error) => {
  console.error('清理失败：', error)
  process.exit(1)
})
