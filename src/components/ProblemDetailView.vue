<template>
  <div class="detail-page" v-if="problem">

    <nav class="back-nav">
      <button class="back-btn" @click="$emit('back')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </button>
      <div class="nav-right">
        <div v-if="currentUser" class="nav-user">
          <div class="user-avatar">{{ currentUser.avatar }}</div>
          <span>{{ currentUser.username }}</span>
        </div>
        <button v-else class="nav-login-btn" @click="$emit('open-auth', 'login')">登录</button>
      </div>
    </nav>

    <!-- Hero -->
    <header class="detail-hero" :style="{ background: problem.bgGradient }">
      <div class="hero-content">
        <div class="hero-emoji">{{ problem.emoji }}</div>
        <div class="hero-glow" :style="{ background: problem.color }"></div>
        <div class="hero-meta">
          <span class="hero-category" :style="{ color: problem.color }">{{ problem.category }}</span>
          <h1 class="hero-title">{{ problem.title }}</h1>
          <p class="hero-subtitle">{{ problem.subtitle }}</p>
          <div class="hero-stats">
            <span class="stat-badge" :class="'diff-' + diffClass(problem.difficulty)">{{ problem.difficulty }}</span>
            <span class="stat-badge neutral">{{ comments.length }} 条评论</span>
            <span class="stat-badge neutral">{{ solutions.length }} 个方案</span>
          </div>
        </div>
      </div>
    </header>

    <div class="detail-content">

      <section class="section">
        <p class="desc-text">{{ problem.description }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: problem.color + '22', color: problem.color }">⚡</span>
          常见原因
        </h2>
        <div class="causes-grid">
          <div v-for="(cause, i) in problem.causes" :key="i" class="cause-item" :style="{ '--color': problem.color }">
            <span class="cause-num" :style="{ color: problem.color }">0{{ i + 1 }}</span>
            <span class="cause-text">{{ cause }}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: problem.color + '22', color: problem.color }">🔧</span>
          解决步骤
          <button class="toggle-all-btn" @click="toggleAll">{{ allExpanded ? '全部折叠' : '全部展开' }}</button>
        </h2>
        <div class="solutions-list">
          <div
            v-for="(sol, i) in problem.solutions" :key="sol.step"
            class="solution-item" :class="{ expanded: expandedSet.has(i) }"
            :style="{ '--color': problem.color }" @click="toggleSol(i)"
          >
            <div class="sol-head">
              <span class="sol-step" :style="{ background: problem.color }">{{ sol.step }}</span>
              <span class="sol-title">{{ sol.title }}</span>
              <svg class="sol-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <Transition name="expand">
              <div class="sol-detail" v-if="expandedSet.has(i)"><p>{{ sol.detail }}</p></div>
            </Transition>
          </div>
        </div>
      </section>

      <section class="section" :style="{ '--color': problem.color }">
        <div class="tip-box">
          <div class="tip-header"><span>💡</span><span class="tip-label">小提示</span></div>
          <p class="tip-text">{{ problem.tips }}</p>
        </div>
      </section>

      <!-- ── 社区方案 ── -->
      <section class="section community-section">
        <h2 class="section-title">
          <span class="section-icon" style="background:rgba(92,186,122,0.15);color:#5cba7a">🌟</span>
          社区方案
          <span class="count-badge">{{ solutions.length }}</span>
        </h2>

        <div v-if="loadingSolutions" class="loading-state">
          <span class="spinner"></span>加载社区方案…
        </div>
        <div v-else>
          <div v-if="solutions.length > 0" class="community-cards">
            <div v-for="sol in solutions" :key="sol.id" class="community-card">
              <div class="card-head">
                <div class="avatar">{{ sol.avatar }}</div>
                <div class="card-info">
                  <span class="card-user">{{ sol.username }}</span>
                  <span class="card-time">{{ formatTime(sol.createdAt) }}</span>
                </div>
                <button class="like-btn" :class="{ liked: sol.likes.includes(currentUser?.id) }" @click="handleSolLike(sol.id, sol.likes)">
                  👍 {{ sol.likes.length || '' }}
                </button>
                <button v-if="currentUser?.id === sol.userId" class="delete-btn" @click="handleDeleteSol(sol.id)">删除</button>
              </div>
              <div class="card-title">{{ sol.title }}</div>
              <div class="card-detail">{{ sol.detail }}</div>
            </div>
          </div>
          <div v-else class="community-empty"><span>🔍</span><p>还没有社区方案，成为第一个分享的人！</p></div>

          <div v-if="currentUser" class="submit-form">
            <div class="form-label">📝 分享你的解决方案</div>
            <input v-model="newSolTitle" class="form-input" placeholder="方案标题，如「调低热床温度5°C有效解决」" maxlength="60" />
            <textarea v-model="newSolDetail" class="form-textarea" placeholder="详细描述步骤和参数，越详细越有帮助…" rows="4" maxlength="500"></textarea>
            <div class="form-footer">
              <span class="char-count">{{ newSolDetail.length }}/500</span>
              <button class="submit-btn" @click="submitSolution" :disabled="submittingSol || !newSolTitle.trim() || !newSolDetail.trim()">
                <span v-if="submittingSol" class="btn-spinner"></span>
                {{ submittingSol ? '发布中…' : '发布方案' }}
              </button>
            </div>
          </div>
          <div v-else class="login-prompt" @click="$emit('open-auth', 'login')">
            <span>💬</span><span>登录后可以分享你的解决方案</span><span class="prompt-arrow">→</span>
          </div>
        </div>
      </section>

      <!-- ── 评论区 ── -->
      <section class="section community-section">
        <h2 class="section-title">
          <span class="section-icon" style="background:rgba(116,185,255,0.15);color:#74b9ff">💬</span>
          讨论
          <span class="count-badge">{{ comments.length }}</span>
        </h2>

        <div v-if="currentUser" class="comment-input-wrap">
          <div class="avatar">{{ currentUser.avatar }}</div>
          <div class="comment-input-inner">
            <textarea v-model="newComment" class="comment-textarea" :placeholder="`以 ${currentUser.username} 的身份发表看法…`" rows="2" maxlength="300" @keydown.ctrl.enter="submitComment"></textarea>
            <div class="form-footer">
              <span class="char-count">{{ newComment.length }}/300 · Ctrl+Enter 发送</span>
              <button class="submit-btn" @click="submitComment" :disabled="submittingComment || !newComment.trim()">
                <span v-if="submittingComment" class="btn-spinner"></span>
                {{ submittingComment ? '发送中…' : '发表' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="login-prompt" @click="$emit('open-auth', 'login')">
          <span>✏️</span><span>登录后参与讨论</span><span class="prompt-arrow">→</span>
        </div>

        <div v-if="loadingComments" class="loading-state">
          <span class="spinner"></span>加载评论…
        </div>
        <div v-else-if="comments.length > 0" class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="avatar">{{ comment.avatar }}</div>
            <div class="comment-body">
              <div class="comment-head">
                <span class="comment-user">{{ comment.username }}</span>
                <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
              </div>
              <p class="comment-text">{{ comment.content }}</p>
              <div class="comment-actions">
                <button class="like-btn small" :class="{ liked: comment.likes.includes(currentUser?.id) }" @click="handleCommentLike(comment.id, comment.likes)">
                  👍 {{ comment.likes.length > 0 ? comment.likes.length : '' }}
                </button>
                <button v-if="currentUser?.id === comment.userId" class="delete-btn" @click="handleDeleteComment(comment.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="currentUser" class="community-empty"><span>💭</span><p>还没有评论，说说你的想法吧</p></div>
      </section>

      <!-- 相关问题 -->
      <section class="section" v-if="relatedProblems.length">
        <h2 class="section-title">
          <span class="section-icon" style="background:rgba(255,255,255,0.06);color:#86868b">📎</span>
          相关问题
        </h2>
        <div class="related-grid">
          <div v-for="rel in relatedProblems" :key="rel.id" class="related-card" :style="{ '--color': rel.color }" @click="$emit('go-detail', rel.id)">
            <span class="related-emoji">{{ rel.emoji }}</span>
            <div><div class="related-title">{{ rel.title }}</div><div class="related-sub">{{ rel.subtitle }}</div></div>
            <svg class="related-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </section>
    </div>

    <div class="float-back">
      <button class="float-back-btn" @click="$emit('back')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10 3L5 7.5l5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        返回问题列表
      </button>
    </div>
  </div>

  <div class="not-found" v-else>
    <p>😵 找不到这个问题</p>
    <button @click="$emit('back')">返回列表</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { problems } from '@/data/problems.js'
import { useAuth } from '@/composables/useAuth.js'
import { useCommunity } from '@/composables/useCommunity.js'

const props = defineProps({ problemId: { type: String, required: true } })
defineEmits(['back', 'go-detail', 'open-auth'])

const { currentUser } = useAuth()
const { getComments, addComment, deleteComment, toggleCommentLike, getSolutions, addSolution, deleteSolution, toggleSolutionLike } = useCommunity()

const problem = computed(() => problems.find(p => p.id === props.problemId))

// ── 步骤展开 ──
const expandedSet = ref(new Set())
const initExpanded = () => { if (problem.value) expandedSet.value = new Set(problem.value.solutions.map((_, i) => i)) }
initExpanded()
watch(() => props.problemId, () => { initExpanded(); loadData() })
const toggleSol = (i) => { const s = new Set(expandedSet.value); s.has(i) ? s.delete(i) : s.add(i); expandedSet.value = s }
const allExpanded = computed(() => problem.value && expandedSet.value.size === problem.value.solutions.length)
const toggleAll = () => { allExpanded.value ? (expandedSet.value = new Set()) : (expandedSet.value = new Set(problem.value.solutions.map((_, i) => i))) }

// ── 社区数据（异步从 Supabase 加载）──
const comments = ref([])
const solutions = ref([])
const loadingComments = ref(true)
const loadingSolutions = ref(true)

const loadData = async () => {
  loadingComments.value = true
  loadingSolutions.value = true
  const [c, s] = await Promise.all([getComments(props.problemId), getSolutions(props.problemId)])
  comments.value = c
  solutions.value = s
  loadingComments.value = false
  loadingSolutions.value = false
}
loadData()

// ── 评论 ──
const newComment = ref('')
const submittingComment = ref(false)
const submitComment = async () => {
  if (!newComment.value.trim() || !currentUser.value) return
  submittingComment.value = true
  try {
    await addComment(props.problemId, currentUser.value.id, newComment.value)
    newComment.value = ''
    comments.value = await getComments(props.problemId)
  } catch (e) { alert(e.message) }
  finally { submittingComment.value = false }
}
const handleCommentLike = async (id, currentLikes) => {
  if (!currentUser.value) return
  await toggleCommentLike(id, currentUser.value.id)
  comments.value = await getComments(props.problemId)
}
const handleDeleteComment = async (id) => {
  if (!confirm('确定删除这条评论？')) return
  await deleteComment(id)
  comments.value = await getComments(props.problemId)
}

// ── 方案 ──
const newSolTitle = ref('')
const newSolDetail = ref('')
const submittingSol = ref(false)
const submitSolution = async () => {
  if (!newSolTitle.value.trim() || !newSolDetail.value.trim() || !currentUser.value) return
  submittingSol.value = true
  try {
    await addSolution(props.problemId, currentUser.value.id, newSolTitle.value, newSolDetail.value)
    newSolTitle.value = ''
    newSolDetail.value = ''
    solutions.value = await getSolutions(props.problemId)
  } catch (e) { alert(e.message) }
  finally { submittingSol.value = false }
}
const handleSolLike = async (id) => {
  if (!currentUser.value) return
  await toggleSolutionLike(id, currentUser.value.id)
  solutions.value = await getSolutions(props.problemId)
}
const handleDeleteSol = async (id) => {
  if (!confirm('确定删除这个方案？')) return
  await deleteSolution(id)
  solutions.value = await getSolutions(props.problemId)
}

// ── 相关问题 ──
const relatedProblems = computed(() => {
  if (!problem.value) return []
  return problems.filter(p => p.id !== problem.value.id && p.category === problem.value.category).slice(0, 3)
})

const formatTime = (ts) => {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}
const diffClass = (d) => { if (d === '紧急') return 'urgent'; if (d === '需处理') return 'warn'; if (d === '进阶') return 'advanced'; return 'normal' }
</script>

<style scoped>
.detail-page { min-height: 100vh; background: #000; color: #f5f5f7; font-family: -apple-system,'PingFang SC','Helvetica Neue',sans-serif; padding-bottom: 120px; }
.back-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 12px 24px; background: rgba(0,0,0,0.88); backdrop-filter: blur(20px); border-bottom: 0.5px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
.back-btn { display: flex; align-items: center; gap: 4px; background: transparent; border: none; color: #2997ff; font-size: 15px; cursor: pointer; font-family: inherit; padding: 0; transition: opacity 0.15s; }
.back-btn:hover { opacity: 0.7; }
.nav-right { display: flex; align-items: center; gap: 8px; }
.nav-user { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #aeaeb2; }
.user-avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.nav-login-btn { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #aeaeb2; padding: 5px 14px; border-radius: 100px; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.18s; }
.nav-login-btn:hover { border-color: rgba(255,255,255,0.3); color: #f5f5f7; }
.detail-hero { padding-top: 52px; min-height: 280px; position: relative; display: flex; align-items: flex-end; overflow: hidden; }
.hero-content { width: 100%; max-width: 800px; margin: 0 auto; padding: 48px 24px 36px; display: flex; align-items: flex-end; gap: 28px; position: relative; z-index: 2; }
.hero-emoji { font-size: 80px; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 12px 32px rgba(0,0,0,0.5)); animation: floatIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
@keyframes floatIn { from { opacity:0; transform:scale(0.6) rotate(-10deg); } to { opacity:1; transform:scale(1) rotate(0deg); } }
.hero-glow { position: absolute; width: 200px; height: 200px; border-radius: 50%; opacity: 0.2; filter: blur(60px); left: 24px; bottom: 20px; }
.hero-meta { flex: 1; min-width: 0; }
.hero-category { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 8px; }
.hero-title { font-size: clamp(1.8rem,5vw,2.8rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; color: #f5f5f7; margin-bottom: 8px; }
.hero-subtitle { font-size: 15px; color: rgba(255,255,255,0.5); margin-bottom: 14px; }
.hero-stats { display: flex; gap: 8px; flex-wrap: wrap; }
.stat-badge { display: inline-block; font-size: 11px; padding: 4px 10px; border-radius: 100px; letter-spacing: 0.04em; }
.stat-badge.neutral { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
.diff-normal { background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); }
.diff-urgent { background:rgba(232,92,92,0.22); color:#ff6b6b; }
.diff-warn { background:rgba(162,155,254,0.18); color:#a29bfe; }
.diff-advanced { background:rgba(116,185,255,0.18); color:#74b9ff; }
.detail-content { max-width: 800px; margin: 0 auto; padding: 0 24px 40px; }
.section { padding: 36px 0; border-bottom: 0.5px solid rgba(255,255,255,0.06); }
.section:last-child { border-bottom: none; }
.section-title { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 600; margin-bottom: 20px; letter-spacing: -0.01em; }
.section-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.count-badge { background: rgba(255,255,255,0.08); color: #86868b; font-size: 12px; padding: 2px 8px; border-radius: 100px; font-weight: 400; }
.toggle-all-btn { margin-left: auto; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #6e6e73; padding: 4px 12px; border-radius: 100px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.18s; }
.toggle-all-btn:hover { color: #aeaeb2; border-color: rgba(255,255,255,0.22); }
.desc-text { font-size: 17px; color: #86868b; line-height: 1.75; }
.causes-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap: 10px; }
.cause-item { background: #1c1c1e; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 8px; border: 0.5px solid rgba(255,255,255,0.06); transition: border-color 0.2s; }
.cause-item:hover { border-color: rgba(255,255,255,0.12); }
.cause-num { font-size: 12px; font-weight: 700; }
.cause-text { font-size: 14px; color: #e5e5ea; line-height: 1.4; font-weight: 500; }
.solutions-list { display: flex; flex-direction: column; gap: 8px; }
.solution-item { background: #1c1c1e; border-radius: 16px; overflow: hidden; border: 0.5px solid rgba(255,255,255,0.06); cursor: pointer; transition: border-color 0.2s; }
.solution-item:hover { border-color: rgba(255,255,255,0.12); }
.solution-item.expanded { border-color: color-mix(in srgb, var(--color) 30%, transparent); }
.sol-head { display: flex; align-items: center; gap: 14px; padding: 16px 18px; }
.sol-step { width: 26px; height: 26px; border-radius: 50%; font-size: 12px; font-weight: 700; color: #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sol-title { flex: 1; font-size: 15px; font-weight: 500; color: #f5f5f7; }
.sol-arrow { color: #48484a; transition: transform 0.25s, color 0.2s; flex-shrink: 0; }
.solution-item.expanded .sol-arrow { transform: rotate(180deg); color: var(--color); }
.sol-detail { padding: 0 18px 18px 58px; }
.sol-detail p { font-size: 14px; color: #86868b; line-height: 1.75; }
.expand-enter-active, .expand-leave-active { transition: all 0.22s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
.expand-enter-to, .expand-leave-from { max-height: 400px; opacity: 1; }
.tip-box { background: color-mix(in srgb, var(--color) 8%, #1c1c1e); border: 0.5px solid color-mix(in srgb, var(--color) 25%, transparent); border-radius: 16px; padding: 20px 22px; }
.tip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.tip-label { font-size: 13px; font-weight: 600; color: var(--color); letter-spacing: 0.04em; }
.tip-text { font-size: 14px; color: #aeaeb2; line-height: 1.75; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 10px; color: #48484a; font-size: 14px; padding: 32px 0; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.07); border-top-color: #6e6e73; border-radius: 50%; animation: spin 0.75s linear infinite; flex-shrink: 0; }
.btn-spinner { width: 12px; height: 12px; border: 1.5px solid rgba(29,29,31,0.15); border-top-color: #1d1d1f; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.community-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.community-card { background: #1c1c1e; border: 0.5px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 18px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.card-info { flex: 1; min-width: 0; }
.card-user { font-size: 13px; font-weight: 600; color: #e5e5ea; display: block; }
.card-time { font-size: 11px; color: #48484a; }
.card-title { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 8px; }
.card-detail { font-size: 14px; color: #86868b; line-height: 1.7; }
.like-btn { display: flex; align-items: center; gap: 4px; background: transparent; border: 1px solid rgba(255,255,255,0.08); color: #6e6e73; padding: 5px 10px; border-radius: 100px; font-size: 13px; cursor: pointer; transition: all 0.18s; font-family: inherit; }
.like-btn:hover { border-color: rgba(255,255,255,0.18); color: #aeaeb2; }
.like-btn.liked { background: rgba(255,214,0,0.1); border-color: rgba(255,214,0,0.3); color: #ffd60a; }
.like-btn.small { padding: 3px 8px; font-size: 12px; }
.delete-btn { background: transparent; border: none; color: #48484a; font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: color 0.15s; font-family: inherit; }
.delete-btn:hover { color: #ff6b6b; }
.submit-form { background: #1c1c1e; border: 0.5px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; margin-top: 16px; }
.form-label { font-size: 13px; font-weight: 600; color: #86868b; margin-bottom: 12px; letter-spacing: 0.04em; }
.form-input, .form-textarea, .comment-textarea { width: 100%; background: #2c2c2e; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 11px 14px; color: #f5f5f7; font-size: 14px; font-family: inherit; outline: none; resize: vertical; transition: border-color 0.2s; }
.form-input:focus, .form-textarea:focus, .comment-textarea:focus { border-color: rgba(255,255,255,0.2); }
.form-input::placeholder, .form-textarea::placeholder, .comment-textarea::placeholder { color: #48484a; }
.form-input { margin-bottom: 10px; resize: none; }
.form-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.char-count { font-size: 11px; color: #48484a; }
.submit-btn { background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 100px; padding: 8px 20px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: inline-flex; align-items: center; gap: 6px; }
.submit-btn:hover:not(:disabled) { background: #e5e5e7; }
.submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.login-prompt { display: flex; align-items: center; gap: 10px; background: #1c1c1e; border: 1px dashed rgba(255,255,255,0.1); border-radius: 14px; padding: 16px 20px; font-size: 14px; color: #6e6e73; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
.login-prompt:hover { border-color: rgba(255,255,255,0.2); color: #aeaeb2; }
.prompt-arrow { margin-left: auto; color: #2997ff; }
.comment-input-wrap { display: flex; gap: 12px; margin-bottom: 20px; }
.comment-input-inner { flex: 1; }
.comment-textarea { min-height: 70px; }
.comments-list { display: flex; flex-direction: column; gap: 16px; }
.comment-item { display: flex; gap: 12px; }
.comment-body { flex: 1; min-width: 0; }
.comment-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.comment-user { font-size: 13px; font-weight: 600; color: #e5e5ea; }
.comment-time { font-size: 11px; color: #48484a; }
.comment-text { font-size: 14px; color: #aeaeb2; line-height: 1.65; margin-bottom: 8px; word-break: break-word; }
.comment-actions { display: flex; align-items: center; gap: 8px; }
.community-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px; color: #48484a; font-size: 14px; text-align: center; }
.community-empty span { font-size: 24px; }
.related-grid { display: flex; flex-direction: column; gap: 8px; }
.related-card { background: #1c1c1e; border: 0.5px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.2s; }
.related-card:hover { background: #2c2c2e; border-color: color-mix(in srgb, var(--color) 30%, transparent); transform: translateX(4px); }
.related-emoji { font-size: 28px; flex-shrink: 0; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
.related-title { font-size: 15px; font-weight: 500; color: #e5e5ea; margin-bottom: 2px; }
.related-sub { font-size: 12px; color: #48484a; }
.related-arrow { color: #48484a; flex-shrink: 0; margin-left: auto; transition: color 0.2s, transform 0.2s; }
.related-card:hover .related-arrow { color: var(--color); transform: translateX(2px); }
.float-back { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 80; }
.float-back-btn { display: flex; align-items: center; gap: 6px; background: rgba(28,28,30,0.92); border: 0.5px solid rgba(255,255,255,0.15); color: #f5f5f7; padding: 11px 22px; border-radius: 100px; font-size: 14px; font-family: inherit; cursor: pointer; backdrop-filter: blur(16px); box-shadow: 0 4px 24px rgba(0,0,0,0.5); transition: all 0.2s; }
.float-back-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.6); }
.not-found { min-height: 100vh; background: #000; color: #86868b; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; font-family: -apple-system,'PingFang SC',sans-serif; }
.not-found button { background: #1c1c1e; border: 1px solid rgba(255,255,255,0.1); color: #2997ff; padding: 10px 24px; border-radius: 100px; cursor: pointer; font-size: 15px; font-family: inherit; }
@media (max-width: 600px) {
  .hero-content { flex-direction: column; align-items: flex-start; gap: 16px; padding: 72px 20px 28px; }
  .hero-emoji { font-size: 56px; }
  .detail-content { padding: 0 20px 40px; }
  .causes-grid { grid-template-columns: 1fr 1fr; }
  .sol-detail { padding: 0 14px 14px 48px; }
  .float-back { bottom: 20px; }
}
</style>
