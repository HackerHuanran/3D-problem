/**
 * 同步问题封面图到 CloudBase `problem_meta` 集合
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   export META_ENV_ID=你的目标环境ID
 *   node scripts/sync-problem-meta.cjs
 */

const cloudbase = require('@cloudbase/node-sdk')

const SOURCE_ENV_ID = process.env.SOURCE_ENV_ID || process.env.VITE_TCB_ENV_ID || 'cloud1-d0gqkk2h2dea42d2b'
const TARGET_ENV_ID = process.env.TARGET_ENV_ID || process.env.META_ENV_ID || SOURCE_ENV_ID

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法同步 problem_meta 集合。')
  process.exit(1)
}

async function main() {
  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: TARGET_ENV_ID,
  })
  const db = app.database()

  try {
    await db.collection('problem_meta').limit(1).get()
  } catch (error) {
    if (error?.code === 'DATABASE_COLLECTION_NOT_EXIST' || String(error?.message || '').includes('Db or Table not exist')) {
      console.log(`目标环境 ${TARGET_ENV_ID} 中没有 problem_meta 集合，准备直接创建并写入。`)
    } else {
      throw error
    }
  }

  const sourceApp = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: SOURCE_ENV_ID,
  })
  const sourceDb = sourceApp.database()

  let data = []
  try {
    const res = await sourceDb.collection('problem_meta').limit(500).get()
    data = res.data || []
  } catch (error) {
    if (error?.code === 'DATABASE_COLLECTION_NOT_EXIST' || String(error?.message || '').includes('Db or Table not exist')) {
      console.error(`源环境 ${SOURCE_ENV_ID} 中没有 problem_meta 集合，请把 SOURCE_ENV_ID 改成 web 后台所在的环境。`)
      process.exit(1)
    }
    throw error
  }
  const rows = data || []

  let created = 0
  let updated = 0

  for (const row of rows) {
    if (!row?.problem_id) continue
    const payload = {
      problem_id: row.problem_id,
      file_id: row.file_id || null,
      cloud_path: row.cloud_path || null,
      image_url: row.image_url || null,
      updated_at: new Date(),
    }

    let existing = []
    try {
      const { data } = await db.collection('problem_meta').where({ problem_id: row.problem_id }).limit(1).get()
      existing = data || []
    } catch (error) {
      if (error?.code !== 'DATABASE_COLLECTION_NOT_EXIST' && !String(error?.message || '').includes('Db or Table not exist')) {
        throw error
      }
    }

    if (existing?.length) {
      await db.collection('problem_meta').doc(existing[0]._id).update(payload)
      updated += 1
    } else {
      await db.collection('problem_meta').add({
        ...payload,
        created_at: new Date(),
      })
      created += 1
    }
  }

  console.log(`problem_meta 同步完成：新增 ${created} 条，更新 ${updated} 条，总计 ${rows.length} 条。`)
}

main().catch((error) => {
  console.error('同步失败：', error)
  process.exit(1)
})
