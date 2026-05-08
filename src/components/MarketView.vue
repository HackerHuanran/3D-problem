<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMarket } from '@/composables/useMarket.js'

const props = defineProps({ currentUser: Object })
const emit  = defineEmits(['open-auth'])

const CATEGORIES     = ['全部', '代打服务', '求购耗材', '出售设备', '技术求助', '其他']
const FORM_CATEGORIES = ['代打服务', '求购耗材', '出售设备', '技术求助', '其他']

const CAT_STYLE = {
  '代打服务': { background: 'rgba(249,115,22,.18)',  color: '#fb923c' },
  '求购耗材': { background: 'rgba(99,102,241,.18)',  color: '#818cf8' },
  '出售设备': { background: 'rgba(168,85,247,.18)',  color: '#c084fc' },
  '技术求助': { background: 'rgba(6,182,212,.18)',   color: '#22d3ee' },
  '其他':     { background: 'rgba(107,114,128,.18)', color: '#9ca3af' },
}

const { posts, loading, dbError, fetchPosts, createPost, deletePost } = useMarket()

const activeCategory = ref('全部')
const showModal      = ref(false)
const submitting     = ref(false)
const submitError    = ref('')

const emptyForm = () => ({ title: '', category: '代打服务', description: '', budget: '', contact: '' })
const form = ref(emptyForm())

const filtered = computed(() =>
  activeCategory.value === '全部' ? posts.value : posts.value.filter(p => p.category === activeCategory.value)
)

onMounted(fetchPosts)

function openModal() {
  if (!props.currentUser) { emit('open-auth', 'login'); return }
  form.value   = emptyForm()
  submitError.value = ''
  showModal.value  = true
}

async function submit() {
  const { title, description, contact } = form.value
  if (!title.trim() || !description.trim() || !contact.trim()) {
    submitError.value = '请填写标题、描述和联系方式'
    return
  }
  submitting.value  = true
  submitError.value = ''
  try {
    await createPost(props.currentUser.id, form.value)
    showModal.value = false
    await fetchPosts()
  } catch (e) {
    submitError.value = e.message
  } finally {
    submitting.value = false
  }
}

async function remove(postId) {
  if (!confirm('确定删除这条需求吗？')) return
  try { await deletePost(postId); await fetchPosts() } catch {}
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return '刚刚'
  if (s < 3600)  return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}
</script>

<template>
  <div class="market-page">
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">3D 打印 · 供需市场</p>
        <h1 class="h1">找到你需要的<br><em>打印伙伴。</em></h1>
        <p class="desc">发布代打需求、求购耗材或出售闲置设备，让社区帮你解决问题。</p>
        <button class="post-btn" @click="openModal">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          发布需求
        </button>
      </div>
    </section>

    <div class="bar">
      <div class="bar-inner">
        <div class="cats">
          <button
            v-for="c in CATEGORIES" :key="c"
            :class="['cat-btn', { active: activeCategory === c }]"
            @click="activeCategory = c"
          >{{ c }}</button>
        </div>
        <span class="result-count">{{ filtered.length }} 条</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-box">
      <div class="spinner"></div>
      <p>加载中…</p>
    </div>

    <!-- DB not set up yet -->
    <div v-else-if="dbError" class="state-box">
      <p class="err-icon">⚠️</p>
      <p class="err-title">加载失败</p>
      <p class="err-desc">{{ dbError }}</p>
      <button class="post-btn small" @click="fetchPosts" style="margin-top:8px">重试</button>
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="state-box">
      <p class="empty-icon">📭</p>
      <p class="empty-title">暂无{{ activeCategory === '全部' ? '' : activeCategory }}内容</p>
      <p class="empty-desc">成为第一个发布需求的人吧！</p>
      <button class="post-btn small" @click="openModal">发布需求</button>
    </div>

    <!-- Post grid -->
    <div v-else class="grid-wrap">
      <div class="grid">
        <article v-for="post in filtered" :key="post.id" class="card">
          <div class="card-top">
            <span class="badge" :style="CAT_STYLE[post.category]">{{ post.category }}</span>
            <span :class="['status', post.status === '进行中' ? 'status-active' : 'status-done']">{{ post.status }}</span>
          </div>

          <h2 class="card-title">{{ post.title }}</h2>
          <p class="card-desc">{{ post.description }}</p>

          <div class="card-tags">
            <span v-if="post.budget" class="tag">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3v6M4.5 4.5h2.25a.75.75 0 010 1.5H5.25a.75.75 0 000 1.5H7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              预算：{{ post.budget }}
            </span>
            <span class="tag">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V2a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.2"/><path d="M4 4h4M4 6.5h4M4 9h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              {{ post.contact }}
            </span>
          </div>

          <div class="card-footer">
            <div class="poster">
              <div class="avatar">{{ post.avatar }}</div>
              <span class="username">{{ post.username }}</span>
            </div>
            <span class="time">{{ timeAgo(post.createdAt) }}</span>
            <button
              v-if="currentUser && currentUser.id === post.userId"
              class="del-btn"
              @click="remove(post.id)"
              title="删除"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.5 8h7l.5-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </article>
      </div>
    </div>

    <!-- Post modal -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-mask">
        <div class="modal-box">
          <div class="modal-head">
            <h2>发布需求</h2>
            <button class="close-btn" @click="showModal = false">✕</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>类型 <span class="req">*</span></label>
              <div class="radio-group">
                <label v-for="c in FORM_CATEGORIES" :key="c" class="radio-item">
                  <input type="radio" :value="c" v-model="form.category" />
                  <span :style="CAT_STYLE[c]" class="radio-label">{{ c }}</span>
                </label>
              </div>
            </div>

            <div class="field">
              <label>标题 <span class="req">*</span></label>
              <input v-model="form.title" placeholder="如：需要代打一个机械臂外壳零件" maxlength="60" />
              <span class="char-count">{{ form.title.length }}/60</span>
            </div>

            <div class="field">
              <label>需求描述 <span class="req">*</span></label>
              <textarea v-model="form.description" placeholder="详细说明你的需求，包括尺寸、数量、材料要求等…" rows="4" maxlength="500"></textarea>
              <span class="char-count">{{ form.description.length }}/500</span>
            </div>

            <div class="field">
              <label>预算范围</label>
              <input v-model="form.budget" placeholder="如：50–200 元，或填「面议」" />
            </div>

            <div class="field">
              <label>联系方式 <span class="req">*</span></label>
              <input v-model="form.contact" placeholder="微信号 / QQ / 邮箱 / 电话" />
            </div>

            <div v-if="submitError" class="submit-error">{{ submitError }}</div>

            <button class="submit-btn" :class="{ loading: submitting }" :disabled="submitting" @click="submit">
              <span v-if="submitting" class="btn-spinner"></span>
              {{ submitting ? '发布中…' : '发布需求' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.market-page { min-height: 100vh; background: #000; }

.hero { padding: 64px 24px 44px; text-align: center; }
.hero-inner { max-width: 600px; margin: 0 auto; }
.eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #6e6e73; margin-bottom: 16px; }
.h1 { font-size: clamp(32px, 5vw, 52px); font-weight: 700; color: #f5f5f7; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 16px; }
.h1 em { font-style: normal; color: #ff6b6b; }
.desc { font-size: 15px; color: #86868b; line-height: 1.6; margin-bottom: 28px; }
.post-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 100px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.post-btn:hover { background: #e5e5e7; }
.post-btn.small { padding: 10px 20px; font-size: 14px; }

.bar { border-bottom: 0.5px solid rgba(255,255,255,0.08); }
.bar-inner { max-width: 1200px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cats { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.cat-btn { padding: 6px 14px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #86868b; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
.cat-btn:hover { border-color: rgba(255,255,255,0.22); color: #aeaeb2; }
.cat-btn.active { background: #f5f5f7; color: #1d1d1f; border-color: #f5f5f7; font-weight: 500; }
.result-count { font-size: 12px; color: #48484a; white-space: nowrap; }

/* State boxes */
.state-box { max-width: 400px; margin: 80px auto; text-align: center; color: #6e6e73; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 0 24px; }
.spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #86868b; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.err-icon, .empty-icon { font-size: 40px; }
.err-title, .empty-title { font-size: 16px; font-weight: 600; color: #aeaeb2; }
.err-desc, .empty-desc { font-size: 13px; line-height: 1.6; }
.err-desc code { background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 12px; }

/* Grid */
.grid-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 24px 80px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

.card { background: #111; border: 0.5px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; transition: border-color 0.2s, transform 0.2s; }
.card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }

.card-top { display: flex; align-items: center; gap: 8px; }
.badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; margin-left: auto; }
.status-active { background: rgba(34,197,94,.15); color: #4ade80; }
.status-done   { background: rgba(107,114,128,.15); color: #9ca3af; }

.card-title { font-size: 16px; font-weight: 600; color: #f5f5f7; line-height: 1.4; letter-spacing: -0.01em; }
.card-desc { font-size: 13px; color: #86868b; line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.card-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #6e6e73; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 4px 10px; }

.card-footer { display: flex; align-items: center; gap: 8px; margin-top: auto; }
.poster { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; }
.avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.username { font-size: 13px; color: #86868b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.time { font-size: 12px; color: #48484a; white-space: nowrap; }
.del-btn { background: transparent; border: none; color: #48484a; cursor: pointer; padding: 4px; border-radius: 6px; transition: color 0.15s, background 0.15s; display: flex; }
.del-btn:hover { color: #ff6b6b; background: rgba(255,107,107,0.1); }

/* Modal */
.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box { background: #1c1c1e; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 24px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 0; }
.modal-head h2 { font-size: 18px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.02em; }
.close-btn { background: transparent; border: none; color: #48484a; font-size: 16px; cursor: pointer; padding: 4px; transition: color 0.15s; }
.close-btn:hover { color: #86868b; }
.modal-body { padding: 20px 24px 28px; display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; position: relative; }
.field label { font-size: 12px; color: #86868b; letter-spacing: 0.04em; }
.req { color: #ff6b6b; }
.field input, .field textarea { background: #2c2c2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 11px 14px; color: #f5f5f7; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; resize: none; }
.field input:focus, .field textarea:focus { border-color: rgba(255,255,255,0.25); }
.field input::placeholder, .field textarea::placeholder { color: #48484a; }
.char-count { font-size: 11px; color: #48484a; text-align: right; margin-top: -4px; }

.radio-group { display: flex; flex-wrap: wrap; gap: 8px; }
.radio-item { display: flex; align-items: center; gap: 0; cursor: pointer; }
.radio-item input[type=radio] { display: none; }
.radio-label { font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 100px; cursor: pointer; border: 1px solid transparent; transition: opacity 0.15s; }
.radio-item input:checked + .radio-label { outline: 2px solid rgba(255,255,255,0.3); }

.submit-error { background: rgba(232,92,92,0.12); border: 0.5px solid rgba(232,92,92,0.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff6b6b; }
.submit-btn { width: 100%; padding: 13px; background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.submit-btn:hover:not(:disabled) { background: #e5e5e7; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #3a3a3c; color: #86868b; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(29,29,31,0.15); border-top-color: #1d1d1f; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
.submit-btn.loading .btn-spinner { border-color: rgba(255,255,255,0.1); border-top-color: #86868b; }

.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
