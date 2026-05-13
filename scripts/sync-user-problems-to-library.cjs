/**
 * 把 user_problems 集合中的用户提交问题同步到 problems 集合
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   node scripts/sync-user-problems-to-library.cjs
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'problem-d1gg06meg3dd7da6b'

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法同步 user_problems。')
  process.exit(1)
}

const CAT_META = {
  '打印机整机': { color: '#74b9ff', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1a2d 100%)', emoji: '🖨️' },
  '喷头热端':   { color: '#ff7675', bg: 'linear-gradient(135deg,#1a0a0a 0%,#2d1010 100%)', emoji: '🔥' },
  '挤出机':     { color: '#b2bec3', bg: 'linear-gradient(135deg,#0f1214 0%,#1a1e22 100%)', emoji: '⚙️' },
  '热床':       { color: '#fd79a8', bg: 'linear-gradient(135deg,#1a0a12 0%,#2d0f1e 100%)', emoji: '🛏️' },
  'AMS送料':    { color: '#a29bfe', bg: 'linear-gradient(135deg,#0f0a1a 0%,#1a0f2d 100%)', emoji: '🎡' },
  '耗材材料':   { color: '#fdcb6e', bg: 'linear-gradient(135deg,#1a160a 0%,#2d230f 100%)', emoji: '🧵' },
  '切片软件':   { color: '#00cec9', bg: 'linear-gradient(135deg,#0a1a1a 0%,#0f2d2d 100%)', emoji: '✂️' },
  '校准调平':   { color: '#0984e3', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1e2d 100%)', emoji: '📐' },
  '打印质量':   { color: '#e17055', bg: 'linear-gradient(135deg,#1a120a 0%,#2d1e0f 100%)', emoji: '🎨' },
  '固件设置':   { color: '#55efc4', bg: 'linear-gradient(135deg,#0a1a14 0%,#0f2d1e 100%)', emoji: '⚡' },
}

function buildPayload(doc) {
  const meta = CAT_META[doc.category] || { color: '#ff6b6b', bg: 'linear-gradient(135deg,#1a0a0a,#2d0f0f)', emoji: '🔧' }
  const causes = doc.causes || []
  const solutions = (doc.solutions || []).map((solution, index) => ({
    step: solution.step || index + 1,
    title: solution.title,
    detail: solution.detail,
    image_url: solution.image_url || null,
  }))
  const problemId = doc.problem_id || `user-${doc._id}`

  return {
    problem_id: problemId,
    status: 'published',
    category: doc.category,
    printerType: null,
    difficulty: doc.difficulty,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description,
    causes,
    solutions,
    tips: doc.tips || '',
    image_url: doc.image_url || null,
    video: null,
    emoji: meta.emoji,
    color: meta.color,
    bgGradient: meta.bg,
    source: 'user_submitted',
    search_text: [doc.title, doc.subtitle, doc.description, ...causes].filter(Boolean).join(' '),
    updated_at: new Date(),
  }
}

async function main() {
  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const { data: rows } = await db.collection('user_problems')
    .orderBy('created_at', 'desc')
    .limit(500)
    .get()

  let created = 0
  let updated = 0

  for (const row of rows) {
    if ((row.status || 'pending') !== 'published') {
      continue
    }

    const payload = buildPayload(row)
    const { data: existing } = await db.collection('problems').where({ problem_id: payload.problem_id }).limit(1).get()

    if (existing?.length) {
      await db.collection('problems').doc(existing[0]._id).update(payload)
      updated += 1
    } else {
      await db.collection('problems').add({
        ...payload,
        created_at: row.created_at || new Date(),
      })
      created += 1
    }

    if (!row.problem_id) {
      await db.collection('user_problems').doc(row._id).update({ problem_id: payload.problem_id })
    }
  }

  console.log(`user_problems 已同步到 problems：新增 ${created} 条，更新 ${updated} 条，共处理 ${rows.length} 条。`)
}

main().catch((error) => {
  console.error('同步失败：', error)
  process.exit(1)
})
