/**
 * 导出可直接导入云开发数据库 `problems` 集合的 JSON 文件
 *
 * 用法：
 *   node scripts/export-problems-json.cjs
 */

const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const { problems } = await import('../src/data/problems.js')

  const rows = problems.map((problem) => ({
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const outputDir = path.resolve(__dirname, '../exports')
  const outputFile = path.join(outputDir, 'problems-import.json')
  const outputJsonlFile = path.join(outputDir, 'problems-import.jsonl')
  const outputJsonLinesJsonFile = path.join(outputDir, 'problems-import-jsonlines.json')
  const jsonLinesContent = rows.map((row) => JSON.stringify(row)).join('\n')

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2), 'utf8')
  fs.writeFileSync(outputJsonlFile, jsonLinesContent, 'utf8')
  fs.writeFileSync(outputJsonLinesJsonFile, jsonLinesContent, 'utf8')

  console.log(`已导出 ${rows.length} 条 problems 数据：`)
  console.log(`- JSON 数组：${outputFile}`)
  console.log(`- JSON Lines：${outputJsonlFile}`)
  console.log(`- JSON Lines（.json 后缀）：${outputJsonLinesJsonFile}`)
}

main().catch((error) => {
  console.error('导出失败：', error)
  process.exit(1)
})
