<template>
  <div class="detail-page" v-if="problem">

    <!-- Back Button -->
    <nav class="back-nav">
      <button class="back-btn" @click="$router.push('/3D-problem/')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </button>
    </nav>

    <!-- Hero Section -->
    <header class="detail-hero" :style="{ background: problem.bgGradient }">
      <div class="hero-content">
        <div class="hero-emoji">{{ problem.emoji }}</div>
        <div class="hero-glow" :style="{ background: problem.color }"></div>
        <div class="hero-meta">
          <span class="hero-category" :style="{ color: problem.color }">{{ problem.category }}</span>
          <h1 class="hero-title">{{ problem.title }}</h1>
          <p class="hero-subtitle">{{ problem.subtitle }}</p>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="detail-content">

      <!-- Description -->
      <section class="section desc-section">
        <p class="desc-text">{{ problem.description }}</p>
      </section>

      <!-- Causes -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: problem.color + '22', color: problem.color }">⚡</span>
          常见原因
        </h2>
        <div class="causes-grid">
          <div
            v-for="(cause, i) in problem.causes"
            :key="i"
            class="cause-item"
            :style="{ '--color': problem.color, '--delay': i * 0.06 + 's' }"
          >
            <span class="cause-num" :style="{ color: problem.color }">0{{ i + 1 }}</span>
            <span class="cause-text">{{ cause }}</span>
          </div>
        </div>
      </section>

      <!-- Solutions -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: problem.color + '22', color: problem.color }">🔧</span>
          解决步骤
        </h2>
        <div class="solutions-list">
          <div
            v-for="(sol, i) in problem.solutions"
            :key="sol.step"
            class="solution-item"
            :class="{ expanded: expandedSol === i }"
            :style="{ '--color': problem.color, '--delay': i * 0.07 + 's' }"
            @click="expandedSol = expandedSol === i ? null : i"
          >
            <div class="sol-head">
              <span class="sol-step" :style="{ background: problem.color }">{{ sol.step }}</span>
              <span class="sol-title">{{ sol.title }}</span>
              <svg class="sol-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <Transition name="expand">
              <div class="sol-detail" v-if="expandedSol === i">
                <p>{{ sol.detail }}</p>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- Tips -->
      <section class="section tips-section" :style="{ '--color': problem.color }">
        <div class="tip-box">
          <div class="tip-header">
            <span class="tip-lamp">💡</span>
            <span class="tip-label">小提示</span>
          </div>
          <p class="tip-text">{{ problem.tips }}</p>
        </div>
      </section>

      <!-- Related -->
      <section class="section" v-if="relatedProblems.length">
        <h2 class="section-title">
          <span class="section-icon" style="background: rgba(255,255,255,0.06); color: #86868b">📎</span>
          相关问题
        </h2>
        <div class="related-grid">
          <div
            v-for="rel in relatedProblems"
            :key="rel.id"
            class="related-card"
            :style="{ '--color': rel.color }"
            @click="$router.push(`/3D-problem/detail/${rel.id}`)"
          >
            <span class="related-emoji">{{ rel.emoji }}</span>
            <div>
              <div class="related-title">{{ rel.title }}</div>
              <div class="related-sub">{{ rel.subtitle }}</div>
            </div>
            <svg class="related-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

    </div>
  </div>

  <!-- 404 state -->
  <div class="not-found" v-else>
    <p>😵 找不到这个问题</p>
    <button @click="$router.push('/3D-problem/')">返回列表</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { problems } from '@/data/problems.js'

const route = useRoute()
const expandedSol = ref(0)

const problem = computed(() =>
  problems.find(p => p.id === route.params.id)
)

const relatedProblems = computed(() => {
  if (!problem.value) return []
  return problems
    .filter(p => p.id !== problem.value.id && p.category === problem.value.category)
    .slice(0, 3)
})
</script>

<style scoped>
/* ── Page ── */
.detail-page {
  min-height: 100vh;
  background: #000;
  color: #f5f5f7;
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* ── Back nav ── */
.back-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-bottom: 0.5px solid rgba(255,255,255,0.08);
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #2997ff;
  font-size: 15px;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: opacity 0.15s;
}
.back-btn:hover { opacity: 0.7; }

/* ── Hero ── */
.detail-hero {
  padding-top: 56px;
  min-height: 340px;
  position: relative;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.hero-content {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 24px 40px;
  display: flex;
  align-items: flex-end;
  gap: 28px;
  position: relative;
  z-index: 2;
}
.hero-emoji {
  font-size: 80px;
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 12px 32px rgba(0,0,0,0.5));
  animation: floatIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes floatIn {
  from { opacity: 0; transform: scale(0.6) rotate(-10deg); }
  to   { opacity: 1; transform: scale(1) rotate(0deg); }
}
.hero-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  opacity: 0.2;
  filter: blur(60px);
  left: 24px;
  bottom: 20px;
}
.hero-meta {
  flex: 1;
  min-width: 0;
}
.hero-category {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 8px;
}
.hero-title {
  font-size: clamp(1.8rem, 5vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #f5f5f7;
  margin-bottom: 8px;
}
.hero-subtitle {
  font-size: 16px;
  color: rgba(255,255,255,0.5);
}

/* ── Content ── */
.detail-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px 100px;
}

/* ── Section ── */
.section {
  padding: 36px 0;
  border-bottom: 0.5px solid rgba(255,255,255,0.06);
}
.section:last-child { border-bottom: none; }

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  letter-spacing: -0.01em;
}
.section-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

/* ── Description ── */
.desc-text {
  font-size: 17px;
  color: #86868b;
  line-height: 1.75;
}

/* ── Causes ── */
.causes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.cause-item {
  background: #1c1c1e;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fadeUp 0.4s ease both;
  animation-delay: var(--delay);
  border: 0.5px solid rgba(255,255,255,0.06);
  transition: border-color 0.2s;
}
.cause-item:hover {
  border-color: rgba(255,255,255,0.12);
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cause-num {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}
.cause-text {
  font-size: 14px;
  color: #e5e5ea;
  line-height: 1.4;
  font-weight: 500;
}

/* ── Solutions ── */
.solutions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.solution-item {
  background: #1c1c1e;
  border-radius: 16px;
  overflow: hidden;
  border: 0.5px solid rgba(255,255,255,0.06);
  cursor: pointer;
  animation: fadeUp 0.4s ease both;
  animation-delay: var(--delay);
  transition: border-color 0.2s;
}
.solution-item:hover,
.solution-item.expanded {
  border-color: rgba(255,255,255,0.12);
}
.solution-item.expanded {
  border-color: color-mix(in srgb, var(--color) 30%, transparent);
}
.sol-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
}
.sol-step {
  width: 26px; height: 26px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #000;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sol-title {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #f5f5f7;
}
.sol-arrow {
  color: #48484a;
  transition: transform 0.25s, color 0.2s;
  flex-shrink: 0;
}
.solution-item.expanded .sol-arrow {
  transform: rotate(180deg);
  color: var(--color);
}
.sol-detail {
  padding: 0 18px 18px 58px;
}
.sol-detail p {
  font-size: 14px;
  color: #86868b;
  line-height: 1.75;
}

/* Expand transition */
.expand-enter-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 200px;
  opacity: 1;
}

/* ── Tips ── */
.tip-box {
  background: color-mix(in srgb, var(--color) 8%, #1c1c1e);
  border: 0.5px solid color-mix(in srgb, var(--color) 25%, transparent);
  border-radius: 16px;
  padding: 20px 22px;
}
.tip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.tip-lamp { font-size: 18px; }
.tip-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color);
  letter-spacing: 0.04em;
}
.tip-text {
  font-size: 14px;
  color: #aeaeb2;
  line-height: 1.75;
}

/* ── Related ── */
.related-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.related-card {
  background: #1c1c1e;
  border: 0.5px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.related-card:hover {
  background: #2c2c2e;
  border-color: color-mix(in srgb, var(--color) 30%, transparent);
  transform: translateX(4px);
}
.related-emoji {
  font-size: 28px;
  flex-shrink: 0;
}
.related-title {
  font-size: 15px;
  font-weight: 500;
  color: #e5e5ea;
  margin-bottom: 2px;
}
.related-sub {
  font-size: 12px;
  color: #48484a;
}
.related-arrow {
  color: #48484a;
  margin-left: auto;
  flex-shrink: 0;
  transition: color 0.2s, transform 0.2s;
}
.related-card:hover .related-arrow {
  color: var(--color);
  transform: translateX(2px);
}

/* ── 404 ── */
.not-found {
  min-height: 100vh;
  background: #000;
  color: #86868b;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-family: -apple-system, 'PingFang SC', sans-serif;
}
.not-found button {
  background: #1c1c1e;
  border: 1px solid rgba(255,255,255,0.1);
  color: #2997ff;
  padding: 10px 24px;
  border-radius: 100px;
  cursor: pointer;
  font-size: 15px;
  font-family: inherit;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .hero-content { flex-direction: column; align-items: flex-start; gap: 16px; padding: 80px 20px 32px; }
  .hero-emoji { font-size: 56px; }
  .detail-content { padding: 0 20px 60px; }
  .causes-grid { grid-template-columns: 1fr 1fr; }
  .sol-detail { padding: 0 14px 14px 48px; }
}
</style>
