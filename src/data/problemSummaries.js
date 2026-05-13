// src/data/problemSummaries.js
// 由 problems.js 自动生成，供首页列表/搜索/诊断使用
import { problems } from './problems.js'

function buildSearchText(problem) {
  return [
    problem.title,
    problem.subtitle,
    problem.description,
    ...(problem.causes || []),
    ...(problem.symptomTags || []),
    ...(problem.searchAliases || []),
    ...(problem.commonMisdiagnosis || []),
  ].filter(Boolean).join(' ')
}

export const problemSummaries = problems.map((problem) => ({
  id: problem.id,
  video: problem.video || null,
  category: problem.category || '未分类',
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
  title: problem.title || '',
  subtitle: problem.subtitle || '',
  emoji: problem.emoji || '🔧',
  color: problem.color || '#ff6b6b',
  bgGradient: problem.bgGradient || 'linear-gradient(135deg,#1a0a0a,#2d0f0f)',
  difficulty: problem.difficulty || '常见',
  description: problem.description || '',
  causes: problem.causes || [],
  image_url: problem.image_url || null,
  searchAliases: problem.searchAliases || [],
  searchText: buildSearchText(problem),
}))

export const problemSummaryIds = problemSummaries.map((item) => item.id)
