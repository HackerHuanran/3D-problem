const filaments = require('../data/filaments.js')

function mapFilament(item) {
  return {
    id: item.id,
    brand: item.brand || '',
    brandFull: item.brandFull || '',
    material: item.material || '',
    variant: item.variant || '',
    difficulty: item.difficulty || '',
    color: item.color || '#74b9ff',
    nozzleRec: item.nozzleRec || 0,
    bedRec: item.bedRec || 0,
    speedRec: item.speedRec || 0,
    fanSpeed: item.fanSpeed || 0,
    tags: item.tags || [],
    tips: item.tips || '',
    source: item.source || '',
    isResin: !!item.isResin,
  }
}

async function listFilaments({ material = '全部', query = '', limit = 80 } = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase()

  return filaments
    .map(mapFilament)
    .filter((item) => {
      if (material !== '全部' && item.material !== material) return false
      if (!normalizedQuery) return true
      return [
        item.brand,
        item.brandFull,
        item.material,
        item.variant,
        item.tips,
        ...(item.tags || []),
      ].some((text) => String(text || '').toLowerCase().includes(normalizedQuery))
    })
    .slice(0, limit)
}

module.exports = {
  listFilaments,
}
