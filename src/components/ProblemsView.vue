<template>
  <div class="problems-page">

    <!-- Hero Header -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow">3D 打印 · 故障排查</p>
        <h1 class="hero-title">遇到问题了？<br><em>这里帮你解决。</em></h1>
        <p class="hero-desc">收录了新手到进阶最常见的打印失败场景，点击卡片查看分步解决方案。</p>
      </div>
    </section>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-inner">
        <button
          v-for="cat in categories"
          :key="cat"
          :class="['filter-btn', { active: activeCategory === cat }]"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
        <span class="filter-count">{{ filteredProblems.length }} 个问题</span>
      </div>
    </div>

    <!-- Problems Grid -->
    <main class="grid-wrap">
      <TransitionGroup name="card" tag="div" class="problems-grid">
        <article
          v-for="(problem, index) in filteredProblems"
          :key="problem.id"
          class="problem-card"
          :style="{ '--card-color': problem.color, '--delay': index * 0.04 + 's' }"
          @click="$router.push(`/3D-problem/detail/${problem.id}`)"
        >
          <!-- Image area -->
          <div class="card-image" :style="{ background: problem.bgGradient }">
            <div class="card-emoji">{{ problem.emoji }}</div>
            <div class="card-glow" :style="{ background: problem.color }"></div>
            <span class="card-difficulty" :class="'diff-' + diffClass(problem.difficulty)">
              {{ problem.difficulty }}
            </span>
          </div>

          <!-- Text area -->
          <div class="card-body">
            <div class="card-category">{{ problem.category }}</div>
            <h3 class="card-title">{{ problem.title }}</h3>
            <p class="card-subtitle">{{ problem.subtitle }}</p>
            <div class="card-arrow">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </main>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { problems, categories } from '@/data/problems.js'

const activeCategory = ref('全部')

const filteredProblems = computed(() => {
  if (activeCategory.value === '全部') return problems
  return problems.filter(p => p.category === activeCategory.value)
})

const diffClass = (d) => {
  if (d === '紧急') return 'urgent'
  if (d === '需处理') return 'warn'
  if (d === '进阶') return 'advanced'
  return 'normal'
}
</script>

<style scoped>
/* ── Page ── */
.problems-page {
  min-height: 100vh;
  background: #000;
  color: #f5f5f7;
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* ── Hero ── */
.hero {
  padding: 100px 24px 60px;
  text-align: center;
}
.hero-inner {
  max-width: 640px;
  margin: 0 auto;
}
.hero-eyebrow {
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #86868b;
  margin-bottom: 16px;
  text-transform: uppercase;
}
.hero-title {
  font-size: clamp(2.2rem, 6vw, 3.8rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 20px;
  color: #f5f5f7;
}
.hero-title em {
  font-style: normal;
  background: linear-gradient(135deg, #ff6b6b, #ffb347, #ff6b9d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-desc {
  font-size: 17px;
  color: #86868b;
  line-height: 1.65;
}

/* ── Filter Bar ── */
.filter-bar {
  padding: 0 24px 32px;
}
.filter-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: #86868b;
  padding: 7px 18px;
  border-radius: 100px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  letter-spacing: 0.02em;
}
.filter-btn:hover {
  border-color: rgba(255,255,255,0.3);
  color: #f5f5f7;
}
.filter-btn.active {
  background: #f5f5f7;
  border-color: #f5f5f7;
  color: #1d1d1f;
}
.filter-count {
  margin-left: auto;
  font-size: 12px;
  color: rgba(255,255,255,0.25);
  letter-spacing: 0.05em;
}

/* ── Grid ── */
.grid-wrap {
  padding: 0 24px 100px;
}
.problems-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

/* ── Card ── */
.problem-card {
  background: #1c1c1e;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
  animation: cardIn 0.5s ease both;
  animation-delay: var(--delay);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.problem-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
}
.problem-card:active {
  transform: translateY(-2px) scale(0.99);
}

/* Card image area */
.card-image {
  position: relative;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.card-emoji {
  font-size: 72px;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.4));
  transition: transform 0.3s ease;
  line-height: 1;
}
.problem-card:hover .card-emoji {
  transform: scale(1.12) translateY(-4px);
}
.card-glow {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.25;
  filter: blur(40px);
  z-index: 1;
  transition: opacity 0.3s, transform 0.3s;
}
.problem-card:hover .card-glow {
  opacity: 0.45;
  transform: scale(1.3);
}

/* Difficulty badge */
.card-difficulty {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 100px;
  z-index: 3;
  letter-spacing: 0.04em;
  backdrop-filter: blur(8px);
}
.diff-normal   { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); }
.diff-urgent   { background: rgba(232,92,92,0.25);   color: #ff6b6b; }
.diff-warn     { background: rgba(162,155,254,0.2);  color: #a29bfe; }
.diff-advanced { background: rgba(116,185,255,0.2);  color: #74b9ff; }

/* Card text area */
.card-body {
  padding: 20px 22px 22px;
  position: relative;
}
.card-category {
  font-size: 11px;
  color: var(--card-color);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
  font-weight: 500;
}
.card-title {
  font-size: 17px;
  font-weight: 600;
  color: #f5f5f7;
  margin-bottom: 5px;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.card-subtitle {
  font-size: 13px;
  color: #6e6e73;
  line-height: 1.4;
  margin-bottom: 16px;
}
.card-arrow {
  color: var(--card-color);
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}
.problem-card:hover .card-arrow {
  transform: translateX(4px);
}

/* ── Transition ── */
.card-enter-active, .card-leave-active {
  transition: all 0.3s ease;
}
.card-enter-from, .card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .hero { padding: 72px 20px 40px; }
  .problems-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .card-image { height: 160px; }
  .card-emoji { font-size: 52px; }
  .card-body { padding: 14px 16px 16px; }
  .card-title { font-size: 14px; }
  .filter-bar { padding: 0 20px 24px; }
  .grid-wrap { padding: 0 20px 60px; }
}
</style>
