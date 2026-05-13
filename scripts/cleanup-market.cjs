/**
 * 清空需求广场相关数据
 *
 * 当前按现有项目数据库结构清理以下集合：
 * - market_posts
 * - market_comments
 * - market_interests
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   node scripts/cleanup-market.cjs
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'problem-d1gg06meg3dd7da6b'

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法清空需求广场数据。')
  process.exit(1)
}

async function clearCollection(db, name) {
  let removed = 0

  while (true) {
    const { data } = await db.collection(name).limit(100).get()
    const rows = data || []
    if (!rows.length) break

    for (const row of rows) {
      await db.collection(name).doc(row._id).remove()
      removed += 1
    }
  }

  return removed
}

async function main() {
  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const targets = ['market_comments', 'market_interests', 'market_posts']
  const result = {}

  for (const name of targets) {
    try {
      result[name] = await clearCollection(db, name)
    } catch (error) {
      const msg = error?.message || ''
      const code = error?.code || ''
      if (String(code).includes('COLLECTION_NOT_EXIST') || msg.includes('not exist')) {
        result[name] = '集合不存在，已跳过'
        continue
      }
      throw error
    }
  }

  console.log('需求广场清理完成：')
  Object.entries(result).forEach(([name, count]) => {
    console.log(`- ${name}: ${count}`)
  })
}

main().catch((error) => {
  console.error('清理失败：', error)
  process.exit(1)
})
