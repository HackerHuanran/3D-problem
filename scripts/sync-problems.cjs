/**
 * 同步本地题库到 CloudBase `problems` 集合
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   node scripts/sync-problems.cjs
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'problem-d1gg06meg3dd7da6b'

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法同步 problems 集合。')
  process.exit(1)
}

async function main() {
  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const { problems } = await import('../src/data/problems.js')
  const collection = db.collection('problems')

  let created = 0
  let updated = 0

  for (const problem of problems) {
    const payload = {
      problem_id: problem.id,
      title: problem.title,
      subtitle: problem.subtitle,
      category: problem.category,
      printerType: problem.printerType || null,
      stages: problem.stages || [],
      severity: problem.severity || 'common',
      materials: problem.materials || [],
      symptomTags: problem.symptomTags || [],
      estimatedTime: problem.estimatedTime || '',
      checkOrder: problem.checkOrder || '',
      firstAction: problem.firstAction || '',
      relatedIds: problem.relatedIds || [],
      commonMisdiagnosis: problem.commonMisdiagnosis || [],
      emoji: problem.emoji,
      color: problem.color,
      bgGradient: problem.bgGradient,
      difficulty: problem.difficulty,
      description: problem.description,
      causes: problem.causes || [],
      solutions: (problem.solutions || []).map((solution, index) => ({
        step: solution.step || index + 1,
        title: solution.title,
        detail: solution.detail,
        image_url: solution.image_url || null,
      })),
      tips: problem.tips || '',
      video: problem.video || null,
      image_url: problem.image_url || null,
      search_text: [
        problem.title,
        problem.subtitle,
        problem.description,
        ...(problem.causes || []),
        ...(problem.symptomTags || []),
        ...(problem.searchAliases || []),
        ...(problem.commonMisdiagnosis || []),
      ].filter(Boolean).join(' '),
      updated_at: new Date(),
    }

    const { data: existing } = await collection.where({ problem_id: problem.id }).limit(1).get()

    if (existing?.length) {
      await collection.doc(existing[0]._id).update(payload)
      updated += 1
    } else {
      await collection.add({
        ...payload,
        created_at: new Date(),
      })
      created += 1
    }
  }

  console.log(`problems 集合同步完成：新增 ${created} 条，更新 ${updated} 条，总计 ${problems.length} 条。`)
}

main().catch((error) => {
  console.error('同步失败：', error)
  process.exit(1)
})
