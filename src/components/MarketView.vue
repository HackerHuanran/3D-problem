<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMarket } from '@/composables/useMarket.js'
import { useUserGuard } from '@/composables/useUserGuard.js'
import { uploadImages } from '@/composables/useStorage.js'
import MarketDetailView from './MarketDetailView.vue'
import { useLocale } from '@/composables/useLocale.js'
import { checkContent, checkImage } from '@/lib/moderate.js'
import { useToast } from '@/composables/useToast.js'

const { t } = useLocale()
const { success, error: toastError } = useToast()

const props = defineProps({ currentUser: Object })
const emit  = defineEmits(['open-auth'])

const currentPost = ref(null)

function openDetail(post) { currentPost.value = post; window.scrollTo(0, 0); incrementViewCount(post.id) }
async function handleDeleted() { currentPost.value = null; await fetchPosts() }
async function goBack() { currentPost.value = null; await fetchPosts() }

const CATEGORIES     = ['全部', '技术求助', '其他']
const FORM_CATEGORIES = ['技术求助', '其他']

const CAT_STYLE = {
  '技术求助': { background: 'rgba(6,182,212,.18)',   color: '#22d3ee' },
  '其他':     { background: 'rgba(107,114,128,.18)', color: '#9ca3af' },
}

const { posts, loading, dbError, fetchPosts, createPost, deletePost, incrementViewCount } = useMarket()
const { ensureUserCanInteract } = useUserGuard()

const activeCategory = ref('全部')
const showModal      = ref(false)
const submitting     = ref(false)
const submitError    = ref('')

const emptyForm = () => ({ title: '', category: '技术求助', description: '', budget: '' })
const form = ref(emptyForm())

// image upload
const formFiles    = ref([])
const formPreviews = ref([])

function onFormFileChange(e) {
  const toAdd = [...e.target.files].slice(0, 5 - formFiles.value.length)
  toAdd.forEach(f => {
    formFiles.value.push(f)
    formPreviews.value.push(URL.createObjectURL(f))
  })
  e.target.value = ''
}
function removeFormFile(i) {
  URL.revokeObjectURL(formPreviews.value[i])
  formFiles.value.splice(i, 1)
  formPreviews.value.splice(i, 1)
}
function clearFormFiles() {
  formPreviews.value.forEach(u => URL.revokeObjectURL(u))
  formFiles.value    = []
  formPreviews.value = []
}

const filtered = computed(() =>
  activeCategory.value === '全部' ? posts.value : posts.value.filter(p => p.category === activeCategory.value)
)

onMounted(fetchPosts)

function openModal() {
  if (!props.currentUser) { emit('open-auth', 'login'); return }
  form.value   = emptyForm()
  submitError.value = ''
  clearFormFiles()
  showModal.value  = true
}

function catLabel(c) {
  const map = {
    '技术求助': t('mc.help'),
    '其他':     t('mc.other'),
  }
  return map[c] ?? c
}

async function submit() {
  const { title, description } = form.value
  if (!title.trim() || !description.trim()) {
    submitError.value = t('m.requiredErr')
    return
  }
  submitting.value  = true
  submitError.value = ''
  try {
    await ensureUserCanInteract(props.currentUser.id, '发布需求')
    const { pass, msg } = await checkContent(`${form.value.title}\n${form.value.description}`)
    if (!pass) { submitError.value = msg; return }

    for (const file of formFiles.value) {
      const { pass: imgPass, msg: imgMsg } = await checkImage(file)
      if (!imgPass) { submitError.value = imgMsg; return }
    }

    const images = formFiles.value.length
      ? await uploadImages(formFiles.value, props.currentUser.id)
      : []
    await createPost(props.currentUser.id, { ...form.value, images })
    clearFormFiles()
    showModal.value = false
    await fetchPosts()
    success('需求发布成功')
  } catch (e) {
    submitError.value = e.message
    toastError(submitError.value || '需求发布失败')
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
  <!-- 详情页 -->
  <MarketDetailView
    v-if="currentPost"
    :post="currentPost"
    :current-user="currentUser"
    @back="goBack"
    @open-auth="emit('open-auth', $event)"
    @deleted="handleDeleted"
  />

  <div v-else class="market-page">
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">{{ t('m.eyebrow') }}</p>
        <h1 class="h1">{{ t('m.h1a') }}<br><em>{{ t('m.h1b') }}</em></h1>
        <p class="desc">{{ t('m.desc') }}</p>
        <button class="post-btn" @click="openModal">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          {{ t('m.postBtn') }}
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
          >{{ c === '全部' ? t('m.all') : catLabel(c) }}</button>
        </div>
        <span class="result-count">{{ t('m.results', { n: filtered.length }) }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-box">
      <div class="spinner"></div>
      <p>{{ t('m.loading') }}</p>
    </div>

    <!-- DB not set up yet -->
    <div v-else-if="dbError" class="state-box">
      <p class="err-icon">⚠️</p>
      <p class="err-title">{{ t('m.loadFail') }}</p>
      <p class="err-desc">{{ dbError }}</p>
      <button class="post-btn small" @click="fetchPosts" style="margin-top:8px">{{ t('m.retry') }}</button>
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="state-box">
      <p class="empty-icon">📭</p>
      <p class="empty-title">{{ t('m.emptyTitle', { cat: activeCategory === '全部' ? '' : catLabel(activeCategory) }) }}</p>
      <p class="empty-desc">{{ t('m.emptyDesc') }}</p>
      <button class="post-btn small" @click="openModal">{{ t('m.postBtn') }}</button>
    </div>

    <!-- Post grid -->
    <div v-else class="grid-wrap">
      <div class="grid">
        <article v-for="post in filtered" :key="post.id" class="card" @click="openDetail(post)" style="cursor:pointer">
          <div class="card-top">
            <span class="badge" :style="CAT_STYLE[post.category]">{{ catLabel(post.category) }}</span>
            <span :class="['status', (post.status === '待解决' || post.status === '进行中') ? 'status-active' : 'status-done']">{{ (post.status === '待解决' || post.status === '进行中') ? t('m.active') : t('m.done') }}</span>
          </div>

          <h2 class="card-title">{{ post.title }}</h2>
          <p class="card-desc">{{ post.description }}</p>

          <div class="card-stats">
            <span class="stat-item">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="1.2"/></svg>
              {{ post.viewCount }}
            </span>
            <span class="stat-item">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10.5S1 7.5 1 4a3 3 0 015 0 3 3 0 015 0c0 3.5-5 6.5-5 6.5z" stroke="currentColor" stroke-width="1.2"/></svg>
              {{ post.interestCount }}
            </span>
          </div>

          <div class="card-footer">
            <div class="poster">
              <div class="avatar">{{ post.avatar }}</div>
              <span class="username">{{ post.username }}</span>
            </div>
            <span class="time">{{ timeAgo(post.createdAt) }}</span>
          </div>
        </article>
      </div>
    </div>

    <!-- 发布需求弹窗 -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-mask">
        <div class="modal-box">
          <div class="modal-head">
            <h2>{{ t('m.formTitle') }}</h2>
            <button class="close-btn" @click="showModal = false">✕</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>{{ t('m.type') }} <span class="req">*</span></label>
              <div class="radio-group">
                <label v-for="c in FORM_CATEGORIES" :key="c" class="radio-item">
                  <input type="radio" :value="c" v-model="form.category" />
                  <span :style="CAT_STYLE[c]" class="radio-label">{{ catLabel(c) }}</span>
                </label>
              </div>
            </div>

            <div class="field">
              <label>{{ t('m.title') }} <span class="req">*</span></label>
              <input v-model="form.title" :placeholder="t('m.titlePh')" maxlength="60" />
              <span class="char-count">{{ form.title.length }}/60</span>
            </div>

            <div class="field">
              <label>{{ t('m.descLab') }} <span class="req">*</span></label>
              <textarea v-model="form.description" :placeholder="t('m.descPh')" rows="4" maxlength="500"></textarea>
              <span class="char-count">{{ form.description.length }}/500</span>
            </div>

            <div class="field">
              <label>{{ t('m.images') }}</label>
              <div class="img-grid">
                <div v-for="(url, i) in formPreviews" :key="i" class="img-thumb">
                  <img :src="url" />
                  <button type="button" class="img-remove" @click="removeFormFile(i)">✕</button>
                </div>
                <label v-if="formPreviews.length < 5" class="img-add">
                  <input type="file" accept="image/*" multiple style="display:none" @change="onFormFileChange" />
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                </label>
              </div>
            </div>

            <div v-if="submitError" class="submit-error">{{ submitError }}</div>

            <button class="submit-btn" :class="{ loading: submitting }" :disabled="submitting" @click="submit">
              <span v-if="submitting" class="btn-spinner"></span>
              {{ submitting ? t('m.publishing') : t('m.postBtn') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.market-page { min-height: 100vh; background: transparent; }

.hero { padding: 64px 24px 44px; text-align: center; }
.hero-inner { max-width: 600px; margin: 0 auto; }
.eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #6e6e73; margin-bottom: 16px; }
.h1 { font-size: clamp(32px, 5vw, 52px); font-weight: 700; color: #1d1d1f; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 16px; }
.h1 em { font-style: normal; color: #ff6b6b; }
.desc { font-size: 15px; color: #6e6e73; line-height: 1.6; margin-bottom: 28px; }
.post-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%); color: #fff; border: none; border-radius: 100px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: filter 0.15s, box-shadow 0.15s; box-shadow: 0 12px 24px rgba(37, 104, 232, 0.18); }
.post-btn:hover { filter: brightness(1.03); }
.post-btn.small { padding: 10px 20px; font-size: 14px; }

.bar { border-bottom: 1px solid rgba(0,0,0,0.08); background: rgba(255,255,255,0.6); }
.bar-inner { max-width: 1200px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cats { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.cat-btn { padding: 6px 14px; border-radius: 100px; border: 1px solid var(--lab-line); background: rgba(246, 249, 253, 0.96); color: var(--lab-text-soft); font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
.cat-btn:hover { border-color: var(--lab-line-strong); color: var(--lab-text); }
.cat-btn.active { background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%); color: #fff; border-color: transparent; font-weight: 600; box-shadow: 0 10px 22px rgba(37, 104, 232, 0.16); }
.result-count { font-size: 12px; color: #aeaeb2; white-space: nowrap; }

/* State boxes */
.state-box { max-width: 400px; margin: 80px auto; text-align: center; color: #6e6e73; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 0 24px; }
.spinner { width: 32px; height: 32px; border: 2px solid rgba(0,0,0,0.08); border-top-color: #6e6e73; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.err-icon, .empty-icon { font-size: 40px; }
.err-title, .empty-title { font-size: 16px; font-weight: 600; color: #1d1d1f; }
.err-desc, .empty-desc { font-size: 13px; line-height: 1.6; }
.err-desc code { background: rgba(0,0,0,0.06); padding: 1px 6px; border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 12px; }

/* Grid */
.grid-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 24px 80px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 16px; }

.card { background: var(--lab-surface-strong); border: 1px solid var(--lab-line); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s; box-shadow: var(--lab-shadow-sm); }
.card:hover { box-shadow: var(--lab-shadow); transform: translateY(-2px); border-color: rgba(37, 104, 232, 0.2); }

.card-top { display: flex; align-items: center; gap: 8px; }
.badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; margin-left: auto; }
.status-active { background: rgba(34,197,94,.12); color: #16a34a; }
.status-done   { background: rgba(107,114,128,.12); color: #6b7280; }

.card-title { font-size: 16px; font-weight: 600; color: #1d1d1f; line-height: 1.4; letter-spacing: -0.01em; }
.card-desc { font-size: 13px; color: #6e6e73; line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.card-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #6e6e73; background: rgba(0,0,0,0.04); border-radius: 6px; padding: 4px 10px; }

.card-stats  { display: flex; gap: 12px; }
.stat-item   { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #aeaeb2; }
.card-footer { display: flex; align-items: center; gap: 8px; margin-top: auto; }
.poster { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; }
.avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.username { font-size: 13px; color: #6e6e73; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.time { font-size: 12px; color: #aeaeb2; white-space: nowrap; }
.del-btn { background: transparent; border: none; color: #aeaeb2; cursor: pointer; padding: 4px; border-radius: 6px; transition: color 0.15s, background 0.15s; display: flex; }
.del-btn:hover { color: #ff3b30; background: rgba(255,59,48,0.08); }

/* Modal */
.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(12,20,32,0.42); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box { background: rgba(252, 253, 255, 0.98); border: 1px solid var(--lab-line); border-radius: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: var(--lab-shadow-lg); }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 0; }
.modal-head h2 { font-size: 18px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; }
.close-btn { background: rgba(0,0,0,0.06); border: none; color: #6e6e73; font-size: 13px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.close-btn:hover { background: rgba(0,0,0,0.1); color: #1d1d1f; }
.modal-body { padding: 20px 24px 28px; display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; position: relative; }
.field label { font-size: 12px; color: #6e6e73; letter-spacing: 0.04em; }
.req { color: #ff3b30; }
.field input, .field textarea { background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; resize: none; }
.field input:focus, .field textarea:focus { border-color: rgba(0,0,0,0.25); }
.field input::placeholder, .field textarea::placeholder { color: #c7c7cc; }
.char-count { font-size: 11px; color: #aeaeb2; text-align: right; margin-top: -4px; }

.radio-group { display: flex; flex-wrap: wrap; gap: 8px; }
.radio-item { display: flex; align-items: center; gap: 0; cursor: pointer; }
.radio-item input[type=radio] { display: none; }
.radio-label { font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 100px; cursor: pointer; border: 1px solid transparent; transition: opacity 0.15s; }
.radio-item input:checked + .radio-label { outline: 2px solid rgba(0,0,0,0.3); }

.submit-error { background: rgba(255,59,48,0.08); border: 1px solid rgba(255,59,48,0.2); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff3b30; }
.submit-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%); color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 12px 24px rgba(37, 104, 232, 0.18); }
.submit-btn:hover:not(:disabled) { filter: brightness(1.03); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #aeaeb2; color: #fff; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }

.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .bar { position: sticky; top: 84px; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .cats { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .cats::-webkit-scrollbar { display: none; }
  .cat-btn { flex-shrink: 0; }
}
@media (max-width: 480px) {
  .hero { padding: 36px 20px 28px; }
  .bar-inner { padding: 10px 16px; }
  .grid-wrap { padding: 20px 16px 60px; }
  .grid { gap: 10px; }
  .card { padding: 16px; gap: 10px; }
  .modal-box { border-radius: 20px; }
  .modal-body { padding: 16px 18px 24px; }
  .radio-group { gap: 6px; }
  .field input, .field textarea { font-size: 16px; }
}

/* Image upload */
.img-grid  { display: flex; flex-wrap: wrap; gap: 8px; }
.img-thumb { position: relative; width: 76px; height: 76px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-remove { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
.img-add { width: 76px; height: 76px; border: 1.5px dashed rgba(0,0,0,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #aeaeb2; transition: border-color 0.15s, color 0.15s; flex-shrink: 0; }
.img-add:hover { border-color: rgba(0,0,0,0.3); color: #6e6e73; }
</style>
