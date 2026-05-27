/**
 * 导出问题封面公开索引到 public/problem-covers.json
 *
 * 用法：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 *   node scripts/export-problem-covers.cjs
 */

const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'problem-d1gg06meg3dd7da6b'
const CDN_BASE = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'
const OUT_FILE = path.resolve(__dirname, '../public/problem-covers.json')
const REPORT_FILE = path.resolve(__dirname, '../exports/problem-cover-audit.json')

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

function toCdnUrl(row = {}) {
  if (row.cloud_path) return cdnUrl(row.cloud_path)
  if (row.file_id) {
    const match = String(row.file_id).match(/^cloud:\/\/[^/]+\/(.+)$/)
    if (match) return cdnUrl(match[1])
  }
  return normalizeImageUrl(row.image_url)
}

async function getKnownProblems() {
  const problemsModuleUrl = pathToFileURL(path.resolve(__dirname, '../src/data/problems.js')).href
  const { problems } = await import(problemsModuleUrl)
  return problems || []
}

async function main() {
  if (!process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
    console.error('缺少 CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量，无法导出问题封面。')
    process.exit(1)
  }

  const app = cloudbase.init({
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
    env: ENV_ID,
  })
  const db = app.database()

  const knownProblems = await getKnownProblems()
  const knownProblemMap = new Map(knownProblems.map((problem) => [problem.id, problem]))
  const knownProblemIds = new Set(knownProblemMap.keys())
  const { data } = await db.collection('problem_meta').limit(1000).get()
  const covers = {}
  const duplicated = []
  const invalid = []

  ;(data || []).forEach((row) => {
    const problemId = row.problem_id
    const imageUrl = toCdnUrl(row)
    if (!problemId || !imageUrl) return
    if (!knownProblemIds.has(problemId)) invalid.push(problemId)
    if (covers[problemId]) duplicated.push(problemId)
    covers[problemId] = {
      image_url: imageUrl,
      cloud_path: row.cloud_path || '',
      file_id: row.file_id || '',
    }
  })

  const missing = knownProblems
    .filter((problem) => !covers[problem.id])
    .map((problem) => ({
      id: problem.id,
      title: problem.title,
      category: problem.category,
    }))

  const report = {
    env: ENV_ID,
    generated_at: new Date().toISOString(),
    problem_count: knownProblems.length,
    cover_count: Object.keys(covers).length,
    missing_count: missing.length,
    invalid_problem_ids: [...new Set(invalid)],
    duplicated_problem_ids: [...new Set(duplicated)],
    missing,
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(covers, null, 2)}\n`, 'utf8')
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true })
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`问题封面索引已导出：${Object.keys(covers).length} 张 -> ${OUT_FILE}`)
  console.log(`问题封面检查报告：缺 ${missing.length} 张 -> ${REPORT_FILE}`)
  if (invalid.length) console.warn(`发现 ${new Set(invalid).size} 个无效 problem_id，请检查 problem_meta。`)
}

main().catch((error) => {
  console.error('导出失败：', error)
  process.exit(1)
})
