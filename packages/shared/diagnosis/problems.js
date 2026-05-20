export const DIAG_STAGES = [
  { id: 'before', label: '刚开始就失败' },
  { id: 'first-layer', label: '第一层异常' },
  { id: 'mid-print', label: '打印到一半出事' },
  { id: 'surface', label: '能打完但质量差' },
]

export const DIAG_PRINTERS = [
  { id: 'all', label: '不限机型' },
  { id: 'FDM', label: 'FDM' },
  { id: 'SLA', label: 'SLA 光固化' },
]

export const DIAG_MATERIALS = [
  { id: 'any', label: '不限材料' },
  { id: 'pla', label: 'PLA' },
  { id: 'petg', label: 'PETG' },
  { id: 'abs-asa', label: 'ABS / ASA' },
  { id: 'tpu', label: 'TPU' },
  { id: 'resin', label: '树脂' },
]

export const CANDIDATE_META_BY_PROBLEM = {
  'no-extrusion': { checkOrder: '先查供料，再查喷嘴，再查 Z 高度', timeEstimate: '约 5 分钟' },
  'clogged-nozzle': { checkOrder: '先冷拔，再清喷嘴，再换喷嘴', timeEstimate: '约 10 分钟' },
  'filament-tangle': { checkOrder: '先看线盘，再理料路，再重试挤出', timeEstimate: '约 3 分钟' },
  'first-layer-lines': { checkOrder: '先打首层测试，再调 Z 偏移，再复查网格', timeEstimate: '约 8 分钟' },
  'warped-bed': { checkOrder: '先查床网格，再查局部高低差', timeEstimate: '约 10 分钟' },
  'first-layer-not-sticking': { checkOrder: '先清洁热床，再降速，再调温度', timeEstimate: '约 5 分钟' },
  'warping': { checkOrder: '先稳首层，再加 Brim，再控环境温差', timeEstimate: '约 8 分钟' },
  'cooling-vs-adhesion': { checkOrder: '先调风扇，再复查首层附着', timeEstimate: '约 5 分钟' },
  'resin-exposure': { checkOrder: '先打曝光测试，再微调底层与普通层', timeEstimate: '约 15 分钟' },
  'resin-fep-failure': { checkOrder: '先查 FEP 状态，再查离型阻力', timeEstimate: '约 10 分钟' },
  'resin-warping': { checkOrder: '先查支撑，再查摆放角度', timeEstimate: '约 12 分钟' },
  'elephant-foot': { checkOrder: '先抬 Z，再降床温，再做补偿', timeEstimate: '约 6 分钟' },
  'tolerance-calibration': { checkOrder: '先打尺寸块，再调 Flow，再调 XY', timeEstimate: '约 15 分钟' },
  'layer-shift': { checkOrder: '先查碰撞，再查皮带，再降加速度', timeEstimate: '约 10 分钟' },
  'motor-stall': { checkOrder: '先查负载，再查电流与散热', timeEstimate: '约 12 分钟' },
  'printing-noise': { checkOrder: '先定位噪音轴，再查润滑和阻力', timeEstimate: '约 10 分钟' },
  'spaghetti': { checkOrder: '先停机清理，再回看失效起点', timeEstimate: '约 8 分钟' },
  'support-optimization': { checkOrder: '先看切片预览，再补支撑策略', timeEstimate: '约 12 分钟' },
  'extruder-clicking': { checkOrder: '先看堵头，再查温度，再查回抽', timeEstimate: '约 8 分钟' },
  'heat-creep': { checkOrder: '先查热端散热，再做长时验证', timeEstimate: '约 12 分钟' },
  'resin-suction-cup': { checkOrder: '先查吸盘腔，再补泄压孔与角度', timeEstimate: '约 15 分钟' },
  'stringing': { checkOrder: '先降温，再调回抽，再提 travel', timeEstimate: '约 10 分钟' },
  'wet-filament': { checkOrder: '先烘干，再复打对比件', timeEstimate: '约 30-60 分钟' },
  'petg-stringing': { checkOrder: '先压温度，再控速度与回抽', timeEstimate: '约 10 分钟' },
  'blobs-zits': { checkOrder: '先看接缝，再查停顿，再调回抽', timeEstimate: '约 10 分钟' },
  'seam-visible': { checkOrder: '先改接缝位置，再复打立面件', timeEstimate: '约 8 分钟' },
  'pressure-advance': { checkOrder: '先打测试塔，再填入最佳值', timeEstimate: '约 20 分钟' },
  'shrinkage-tolerance': { checkOrder: '先测材料收缩，再做孔径补偿', timeEstimate: '约 15 分钟' },
  'estep-calibration': { checkOrder: '先测 100mm 挤出，再修正 E 步', timeEstimate: '约 15 分钟' },
  'top-surface-rough': { checkOrder: '先加顶层，再查流量与顶面速度', timeEstimate: '约 8 分钟' },
  'under-extrusion': { checkOrder: '先查喷嘴，再查送丝，再查温度', timeEstimate: '约 10 分钟' },
  'missing-thin-details': { checkOrder: '先查摆放，再查特征尺寸与层高', timeEstimate: '约 12 分钟' },
  'resin-wash-cure': { checkOrder: '先减清洗固化，再看后处理节奏', timeEstimate: '约 10 分钟' },
}

export function stageLabel(stageId) {
  return DIAG_STAGES.find((stage) => stage.id === stageId)?.label || stageId || ''
}

export function materialMatches(candidateMaterials = [], selectedMaterial) {
  return candidateMaterials.includes('any') || candidateMaterials.includes(selectedMaterial)
}

export function printerMatches(candidatePrinters = [], selectedPrinter) {
  return selectedPrinter === 'all' || candidatePrinters.includes(selectedPrinter)
}

export function scoreTone(score) {
  if (score >= 88) return { tone: 'high', label: '高匹配' }
  if (score >= 76) return { tone: 'mid', label: '较高匹配' }
  return { tone: 'soft', label: '可疑候选' }
}
