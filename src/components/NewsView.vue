<script setup>
import { ref, computed } from 'vue'
import { useLocale } from '@/composables/useLocale.js'

const { t } = useLocale()

const CATEGORIES = ['全部', '产品发布', '行业动态', '技术前沿', '创客故事', '教程指南']

const CAT_STYLE = {
  '产品发布': { background: 'rgba(99,102,241,.18)',  color: '#818cf8' },
  '行业动态': { background: 'rgba(168,85,247,.18)',  color: '#c084fc' },
  '技术前沿': { background: 'rgba(6,182,212,.18)',   color: '#22d3ee' },
  '创客故事': { background: 'rgba(34,197,94,.18)',   color: '#4ade80' },
  '教程指南': { background: 'rgba(249,115,22,.18)',  color: '#fb923c' },
}

const NEWS = [
  {
    id: 1, category: '产品发布', hot: true,
    title: 'Bambu Lab 推出 A2 系列，售价低至 1999 元',
    summary: '全新 A2 系列 FDM 打印机配备 CoreXY 结构和全自动校准功能，主打高性价比家用市场，最高打印速度达 500mm/s，支持多色打印扩展模块。',
    source: '3D打印之家', date: '2026-05-06', readMin: 3,
  },
  {
    id: 2, category: '行业动态', hot: false,
    title: '3D 打印建筑材料获国家标准认证，商业应用迎里程碑',
    summary: '国家标准化管理委员会正式发布《建筑用3D打印混凝土技术规程》，为 3D 打印在建筑领域大规模应用扫清政策障碍，多个保障房项目已提交试点申请。',
    source: '新华网科技', date: '2026-05-04', readMin: 5,
  },
  {
    id: 3, category: '技术前沿', hot: true,
    title: '新型碳纤维 PLA 复合材料抗拉强度达 280MPa，媲美铝合金',
    summary: '清华大学材料学院研究团队通过纳米级碳纤维与 PLA 的复合工艺，实现桌面级打印件强度重大突破，同时保持良好的打印流动性，无需改造现有设备。',
    source: '科学网', date: '2026-05-02', readMin: 6,
  },
  {
    id: 4, category: '创客故事', hot: false,
    title: '大学生团队用 3D 打印制作智能假肢，成本仅需 800 元',
    summary: '浙江大学五名学生利用开源设计和消费级打印机，历时 8 个月打印出可控制电动假手，让残障用户重获抓握能力，项目已开源并获得公益基金支持。',
    source: '极客公园', date: '2026-04-28', readMin: 4,
  },
  {
    id: 5, category: '行业动态', hot: false,
    title: 'Stratasys 与空客签署战略合作，3D 打印零件进入商用量产',
    summary: 'Stratasys 将为空客 A350 系列提供超过 1000 种 3D 打印内饰零件，年产能计划达 50 万个，标志着增材制造正式进入航空干线机型供应链。',
    source: '航空工业网', date: '2026-04-25', readMin: 4,
  },
  {
    id: 6, category: '教程指南', hot: true,
    title: '2026 年家用 FDM 打印机横评：6 款热门机型深度对比',
    summary: '历时三个月，对市面最受欢迎的 6 款 FDM 家用打印机进行全面测试，包含打印质量、易用性、稳定性、耗材兼容性与性价比五个维度，附完整数据表。',
    source: '3D打印实验室', date: '2026-04-20', readMin: 12,
  },
  {
    id: 7, category: '技术前沿', hot: false,
    title: '多材料打印新突破：一次成型实现软硬结合结构',
    summary: '麻省理工学院研究人员开发出新型多材料 FDM 工艺，可在同一打印过程中精确组合弹性体与刚性材料，无需后期组装，为软体机器人和医疗器械开辟新路。',
    source: 'MIT Technology Review', date: '2026-04-15', readMin: 7,
  },
  {
    id: 8, category: '产品发布', hot: false,
    title: 'Anycubic Photon M9 正式开售，12K 分辨率主打精密零件',
    summary: '全新 12K 单色屏 MSLA 树脂打印机，成型尺寸 218×123×260mm，曝光速度提升 40%，内置自动进料系统，面向齿科、珠宝及工业精密零件场景。',
    source: '3D打印之家', date: '2026-04-10', readMin: 3,
  },
]

const activeCategory = ref('全部')

const filtered = computed(() =>
  activeCategory.value === '全部' ? NEWS : NEWS.filter(n => n.category === activeCategory.value)
)

const catLabel = (c) => {
  if (c === '全部') return t('n.all')
  if (c === '产品发布') return t('n.c.release')
  if (c === '行业动态') return t('n.c.industry')
  if (c === '技术前沿') return t('n.c.tech')
  if (c === '创客故事') return t('n.c.maker')
  if (c === '教程指南') return t('n.c.tutorial')
  return c
}

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  return dateStr
}
</script>

<template>
  <div class="news-page">
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">{{ t('n.eyebrow') }}</p>
        <h1 class="h1">{{ t('n.h1a') }}<br><em>{{ t('n.h1b') }}</em></h1>
        <p class="desc">{{ t('n.desc', { n: NEWS.length }) }}</p>
      </div>
    </section>

    <div class="bar">
      <div class="bar-inner">
        <div class="cats">
          <button
            v-for="c in CATEGORIES" :key="c"
            :class="['cat-btn', { active: activeCategory === c }]"
            @click="activeCategory = c"
          >{{ catLabel(c) }}</button>
        </div>
        <span class="result-count">{{ t('n.results', { n: filtered.length }) }}</span>
      </div>
    </div>

    <div class="grid-wrap">
      <div class="grid">
        <article v-for="item in filtered" :key="item.id" class="card">
          <div class="card-top">
            <span class="badge" :style="CAT_STYLE[item.category]">{{ catLabel(item.category) }}</span>
            <span v-if="item.hot" class="hot-tag">{{ t('n.hot') }}</span>
          </div>
          <h2 class="card-title">{{ item.title }}</h2>
          <p class="card-summary">{{ item.summary }}</p>
          <div class="card-meta">
            <span>{{ item.source }}</span>
            <span class="sep">·</span>
            <span>{{ timeAgo(item.date) }}</span>
            <span class="sep">·</span>
            <span>{{ t('n.read', { n: item.readMin }) }}</span>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.news-page { min-height: 100vh; background: #f5f5f7; }

.hero { padding: 64px 24px 44px; text-align: center; }
.hero-inner { max-width: 600px; margin: 0 auto; }
.eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #6e6e73; margin-bottom: 16px; }
.h1 { font-size: clamp(32px, 5vw, 52px); font-weight: 700; color: #1d1d1f; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 16px; }
.h1 em { font-style: normal; color: #ff6b6b; }
.desc { font-size: 15px; color: #6e6e73; line-height: 1.6; }

.bar { border-bottom: 1px solid rgba(0,0,0,0.08); background: rgba(255,255,255,0.6); }
.bar-inner { max-width: 1200px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cats { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.cat-btn { padding: 6px 14px; border-radius: 100px; border: 1px solid rgba(0,0,0,0.12); background: transparent; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
.cat-btn:hover { border-color: rgba(0,0,0,0.22); color: #1d1d1f; }
.cat-btn.active { background: #1d1d1f; color: #fff; border-color: #1d1d1f; font-weight: 500; }
.result-count { font-size: 12px; color: #aeaeb2; white-space: nowrap; }

.grid-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 24px 80px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

.card { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 12px; transition: box-shadow 0.2s, transform 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.1); transform: translateY(-2px); }
.card-top { display: flex; align-items: center; gap: 8px; }
.badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.hot-tag { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; background: rgba(249,115,22,.12); color: #e56910; }
.card-title { font-size: 16px; font-weight: 600; color: #1d1d1f; line-height: 1.45; letter-spacing: -0.01em; }
.card-summary { font-size: 13px; color: #6e6e73; line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #aeaeb2; margin-top: auto; flex-wrap: wrap; }
.sep { color: #c7c7cc; }
</style>
