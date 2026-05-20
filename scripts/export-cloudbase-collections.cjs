/**
 * 从指定 CloudBase 环境导出集合为 JSON / JSONL 文件
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   export SOURCE_ENV_ID=旧环境ID
 *   npm run export:cloudbase
 *
 * 可选：
 *   export EXPORT_COLLECTIONS=profiles,problem_favorites,problem_history,user_problems,problem_meta
 */

const fs = require('node:fs')
const path = require('node:path')
const cloudbase = require('@cloudbase/node-sdk')

const SOURCE_ENV_ID = process.env.SOURCE_ENV_ID || 'problem-d1gg06meg3dd7da6b'
const PAGE_SIZE = 100
const DEFAULT_COLLECTIONS = [
  'profiles',
  'problem_favorites',
  'problem_history',
  'user_problems',
  'problem_meta',
]

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法导出 CloudBase 集合。')
  process.exit(1)
}

function getCollectionList() {
  const raw = String(process.env.EXPORT_COLLECTIONS || '').trim()
  if (!raw) return DEFAULT_COLLECTIONS
  return raw.split(',').map((item) => item.trim()).filter(Boolean)
}

function createApp(envId) {
  return cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: envId,
  })
}

async function readAllRows(db, collectionName) {
  const rows = []
  let offset = 0

  while (true) {
    const { data } = await db.collection(collectionName).skip(offset).limit(PAGE_SIZE).get()
    const page = data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return rows
}

function stripSystemFields(row) {
  const next = { ...row }
  delete next._id
  delete next._openid
  return next
}

function writeOutputs(collectionName, rows) {
  const outputDir = path.resolve(__dirname, '../exports/cloudbase')
  const jsonFile = path.join(outputDir, `${collectionName}.json`)
  const jsonlFile = path.join(outputDir, `${collectionName}.jsonl`)
  const jsonLinesJsonFile = path.join(outputDir, `${collectionName}-jsonlines.json`)
  const jsonLinesContent = rows.map((row) => JSON.stringify(row)).join('\n')

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(jsonFile, JSON.stringify(rows, null, 2), 'utf8')
  fs.writeFileSync(jsonlFile, jsonLinesContent, 'utf8')
  fs.writeFileSync(jsonLinesJsonFile, jsonLinesContent, 'utf8')

  console.log(`- ${collectionName}: ${rows.length} 条`)
  console.log(`  JSON:  ${jsonFile}`)
  console.log(`  JSONL: ${jsonlFile}`)
  console.log(`  JSON Lines(.json): ${jsonLinesJsonFile}`)
}

async function main() {
  const db = createApp(SOURCE_ENV_ID).database()
  const collections = getCollectionList()

  console.log(`开始导出 CloudBase 集合，源环境：${SOURCE_ENV_ID}`)

  for (const collectionName of collections) {
    try {
      const rows = await readAllRows(db, collectionName)
      writeOutputs(collectionName, rows.map(stripSystemFields))
    } catch (error) {
      const message = String(error?.message || '')
      if (error?.code === 'DATABASE_COLLECTION_NOT_EXIST' || message.includes('Db or Table not exist')) {
        console.log(`- ${collectionName}: 集合不存在，已跳过`)
        continue
      }
      if (error?.code === 'INVALID_ENV' || message.includes('Env Not Exists')) {
        throw new Error(`源环境不可用：${SOURCE_ENV_ID}。当前 SecretId/SecretKey 无法访问该环境，或环境 ID 填错。`)
      }
      throw error
    }
  }

  console.log('导出完成。')
}

main().catch((error) => {
  console.error('导出失败：', error)
  process.exit(1)
})
