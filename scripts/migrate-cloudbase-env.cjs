/**
 * 把旧 CloudBase 环境中的核心集合迁移到新环境
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   export SOURCE_ENV_ID=旧环境ID
 *   export TARGET_ENV_ID=新环境ID
 *   npm run migrate:cloudbase
 *
 * 可选：
 *   export MIGRATE_COLLECTIONS=problems,profiles,problem_favorites,problem_history,user_problems,problem_meta
 */

const cloudbase = require('@cloudbase/node-sdk')

const SOURCE_ENV_ID = process.env.SOURCE_ENV_ID || 'problem-d1gg06meg3dd7da6b'
const TARGET_ENV_ID = process.env.TARGET_ENV_ID
const PAGE_SIZE = 100

const DEFAULT_COLLECTIONS = [
  'problems',
  'profiles',
  'problem_favorites',
  'problem_history',
  'user_problems',
  'problem_meta',
]

const UNIQUE_RULES = {
  problems: ['problem_id'],
  profiles: ['uid'],
  problem_favorites: ['user_id', 'problem_id'],
  problem_history: ['user_id', 'problem_id'],
  user_problems: ['problem_id'],
  problem_meta: ['problem_id'],
}

if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法迁移 CloudBase 数据。')
  process.exit(1)
}

if (!TARGET_ENV_ID) {
  console.error('缺少 TARGET_ENV_ID 环境变量，请填入微信侧新建的云开发环境 ID。')
  process.exit(1)
}

function getCollectionList() {
  const raw = String(process.env.MIGRATE_COLLECTIONS || '').trim()
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

async function verifyEnv(db, envId, role) {
  try {
    await db.collection('problems').limit(1).get()
  } catch (error) {
    const message = String(error?.message || '')
    if (error?.code === 'INVALID_ENV' || message.includes('Env Not Exists')) {
      throw new Error(`${role}环境不可用：${envId}。当前这组 SecretId/SecretKey 无法访问这个环境，或者环境 ID 填错了。`)
    }
    if (error?.code === 'DATABASE_COLLECTION_NOT_EXIST' || message.includes('Db or Table not exist')) {
      return
    }
    throw error
  }
}

async function readAllRows(db, collectionName) {
  let offset = 0
  const rows = []

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

function buildWhere(doc, uniqueFields = []) {
  const where = {}
  uniqueFields.forEach((field) => {
    if (doc[field] !== undefined && doc[field] !== null && doc[field] !== '') {
      where[field] = doc[field]
    }
  })
  return where
}

async function upsertRow(targetDb, collectionName, row) {
  const uniqueFields = UNIQUE_RULES[collectionName] || []
  const payload = stripSystemFields(row)

  if (!uniqueFields.length) {
    await targetDb.collection(collectionName).add(payload)
    return 'created'
  }

  const where = buildWhere(payload, uniqueFields)
  if (Object.keys(where).length !== uniqueFields.length) {
    await targetDb.collection(collectionName).add(payload)
    return 'created'
  }

  const { data } = await targetDb.collection(collectionName).where(where).limit(1).get()
  const existing = data && data[0]

  if (existing?._id) {
    await targetDb.collection(collectionName).doc(existing._id).update(payload)
    return 'updated'
  }

  await targetDb.collection(collectionName).add(payload)
  return 'created'
}

async function migrateCollection(sourceDb, targetDb, collectionName) {
  let rows = []

  try {
    rows = await readAllRows(sourceDb, collectionName)
  } catch (error) {
    if (error?.code === 'DATABASE_COLLECTION_NOT_EXIST' || String(error?.message || '').includes('Db or Table not exist')) {
      console.log(`跳过 ${collectionName}：源环境中不存在该集合。`)
      return
    }
    throw error
  }

  if (!rows.length) {
    console.log(`${collectionName}：源环境没有数据，跳过。`)
    return
  }

  let created = 0
  let updated = 0

  for (const row of rows) {
    const result = await upsertRow(targetDb, collectionName, row)
    if (result === 'updated') updated += 1
    else created += 1
  }

  console.log(`${collectionName}：新增 ${created} 条，更新 ${updated} 条，共处理 ${rows.length} 条。`)
}

async function main() {
  const sourceDb = createApp(SOURCE_ENV_ID).database()
  const targetDb = createApp(TARGET_ENV_ID).database()
  const collections = getCollectionList()

  console.log(`开始迁移 CloudBase 数据：${SOURCE_ENV_ID} -> ${TARGET_ENV_ID}`)
  console.log(`迁移集合：${collections.join(', ')}`)

  await verifyEnv(sourceDb, SOURCE_ENV_ID, '源')
  await verifyEnv(targetDb, TARGET_ENV_ID, '目标')

  for (const collectionName of collections) {
    await migrateCollection(sourceDb, targetDb, collectionName)
  }

  console.log('迁移完成。')
}

main().catch((error) => {
  console.error('迁移失败：', error)
  process.exit(1)
})
