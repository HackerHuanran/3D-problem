<script setup>
import { ref, onMounted } from 'vue'
import { useMarket } from '@/composables/useMarket.js'
import { uploadImages, getImageURLs } from '@/composables/useStorage.js'
import { useLocale } from '@/composables/useLocale.js'

const { t } = useLocale()

const props = defineProps({ currentUser: Object })
const emit  = defineEmits(['back'])

const { posts, loading, dbError, fetchMyPosts, createPost, deletePost, updatePostStatus, updatePost } = useMarket()

const FORM_CATEGORIES = ['代打服务', '求购耗材', '出售设备', '技术求助', '其他']

function catLabel(c) {
  const map = {
    '代打服务': t('mc.print'),
    '求购耗材': t('mc.filament'),
    '出售设备': t('mc.device'),
    '技术求助': t('mc.help'),
    '其他':     t('mc.other'),
  }
  return map[c] ?? c
}

const CAT_STYLE = {
  '代打服务': { background: 'rgba(249,115,22,.18)', color: '#fb923c' },
  '求购耗材': { background: 'rgba(99,102,241,.18)', color: '#818cf8' },
  '出售设备': { background: 'rgba(168,85,247,.18)', color: '#c084fc' },
  '技术求助': { background: 'rgba(6,182,212,.18)',  color: '#22d3ee' },
  '其他':     { background: 'rgba(107,114,128,.18)', color: '#9ca3af' },
}

onMounted(() => fetchMyPosts(props.currentUser.id))

// ── image helpers ──
function makeImgState() {
  return { files: ref([]), previews: ref([]) }
}
function addFiles(state, e) {
  const toAdd = [...e.target.files].slice(0, 5 - state.files.value.length)
  toAdd.forEach(f => {
    state.files.value.push(f)
    state.previews.value.push(URL.createObjectURL(f))
  })
  e.target.value = ''
}
function removeFile(state, i) {
  URL.revokeObjectURL(state.previews.value[i])
  state.files.value.splice(i, 1)
  state.previews.value.splice(i, 1)
}
function clearFiles(state) {
  state.previews.value.forEach(u => URL.revokeObjectURL(u))
  state.files.value    = []
  state.previews.value = []
}

// ── 发布弹窗 ──
const showCreate   = ref(false)
const createForm   = ref({ title: '', category: '代打服务', description: '', budget: '', contact: '' })
const createError  = ref('')
const creating     = ref(false)
const createImg    = makeImgState()

function openCreate() {
  createForm.value  = { title: '', category: '代打服务', description: '', budget: '', contact: '' }
  createError.value = ''
  clearFiles(createImg)
  showCreate.value  = true
}

async function submitCreate() {
  const { title, description, contact } = createForm.value
  if (!title.trim() || !description.trim() || !contact.trim()) {
    createError.value = t('m.requiredErr')
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const images = createImg.files.value.length
      ? await uploadImages(createImg.files.value, props.currentUser.id)
      : []
    await createPost(props.currentUser.id, { ...createForm.value, images })
    clearFiles(createImg)
    showCreate.value = false
    await fetchMyPosts(props.currentUser.id)
  } catch (e) {
    createError.value = e.message
  } finally {
    creating.value = false
  }
}

// ── 编辑弹窗 ──
const showEdit          = ref(false)
const editingPost       = ref(null)
const editForm          = ref({ title: '', category: '代打服务', description: '', budget: '', contact: '' })
const editError         = ref('')
const editing           = ref(false)
const editImg           = makeImgState()
const editExistingImgs  = ref([]) // { id, url }[]

async function openEdit(post) {
  editingPost.value      = post
  editForm.value         = { title: post.title, category: post.category, description: post.description, budget: post.budget || '', contact: post.contact || '' }
  editError.value        = ''
  clearFiles(editImg)
  editExistingImgs.value = []
  showEdit.value         = true
  if (post.images?.length) {
    editExistingImgs.value = await getImageURLs(post.images)
  }
}

function removeExistingImg(i) {
  editExistingImgs.value.splice(i, 1)
}

async function submitEdit() {
  const { title, description, contact } = editForm.value
  if (!title.trim() || !description.trim() || !contact.trim()) {
    editError.value = t('m.requiredErr')
    return
  }
  editing.value = true
  editError.value = ''
  try {
    const newFileIDs = editImg.files.value.length
      ? await uploadImages(editImg.files.value, props.currentUser.id)
      : []
    const images = [...editExistingImgs.value.map(i => i.id), ...newFileIDs]
    await updatePost(editingPost.value.id, { ...editForm.value, images })
    clearFiles(editImg)
    showEdit.value = false
    await fetchMyPosts(props.currentUser.id)
  } catch (e) {
    editError.value = e.message
  } finally {
    editing.value = false
  }
}

// ── 状态切换 + 删除 ──
const actionLoading = ref({})

async function toggleStatus(post) {
  const next = post.status === '进行中' ? '已完成' : '进行中'
  actionLoading.value[post.id + '_s'] = true
  try {
    await updatePostStatus(post.id, next)
    post.status = next
  } catch (e) { alert(e.message) } finally {
    delete actionLoading.value[post.id + '_s']
  }
}

async function remove(post) {
  if (!confirm(t('mp.confirmDelete'))) return
  actionLoading.value[post.id + '_d'] = true
  try {
    await deletePost(post.id)
    await fetchMyPosts(props.currentUser.id)
  } catch {} finally {
    delete actionLoading.value[post.id + '_d']
  }
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)    return '刚刚'
  if (s < 3600)  return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}
</script>

<template>
  <div class="my-posts-page">
    <div class="inner">

      <div class="page-header">
        <button class="back-btn" @click="emit('back')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ t('pd.back') }}
        </button>
        <h1 class="page-title">{{ t('mp.title') }}</h1>
        <button class="create-btn" @click="openCreate">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          {{ t('mp.create') }}
        </button>
      </div>

      <div v-if="loading" class="state-box">
        <div class="spinner"></div>
        <p>{{ t('mp.loading') }}</p>
      </div>

      <div v-else-if="dbError" class="state-box">
        <p style="color:#ff6b6b">{{ dbError }}</p>
        <button class="act-btn" style="margin-top:12px" @click="fetchMyPosts(currentUser.id)">重试</button>
      </div>

      <div v-else-if="posts.length === 0" class="state-box">
        <p class="empty-icon">📭</p>
        <p style="color:#6e6e73;margin-top:8px">{{ t('mp.noPost') }}</p>
        <button class="create-btn" style="margin-top:16px" @click="openCreate">{{ t('mp.firstPost') }}</button>
      </div>

      <div v-else class="post-list">
        <div v-for="post in posts" :key="post.id" class="post-row">
          <div class="row-top">
            <span class="badge" :style="CAT_STYLE[post.category]">{{ catLabel(post.category) }}</span>
            <span :class="['status-tag', post.status === '进行中' ? 'status-active' : 'status-done']">{{ post.status === '进行中' ? t('m.active') : t('m.done') }}</span>
            <span class="row-time">{{ timeAgo(post.createdAt) }}</span>
          </div>
          <h3 class="row-title">{{ post.title }}</h3>
          <p class="row-desc">{{ post.description }}</p>
          <div class="row-actions">
            <button class="act-btn" @click="openEdit(post)">{{ t('mp.edit') }}</button>
            <button class="act-btn" :disabled="actionLoading[post.id + '_s']" @click="toggleStatus(post)">
              {{ post.status === '进行中' ? t('mp.markDone') : t('mp.reopen') }}
            </button>
            <button class="act-btn danger" :disabled="actionLoading[post.id + '_d']" @click="remove(post)">{{ t('mp.delete') }}</button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- 发布弹窗 -->
  <Transition name="modal">
    <div v-if="showCreate" class="modal-mask">
      <div class="modal-box">
        <div class="modal-head">
          <h2>{{ t('m.formTitle') }}</h2>
          <button class="close-btn" @click="showCreate = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('m.type') }} <span class="req">*</span></label>
            <div class="radio-group">
              <label v-for="c in FORM_CATEGORIES" :key="c" class="radio-item">
                <input type="radio" :value="c" v-model="createForm.category" />
                <span :style="CAT_STYLE[c]" class="radio-label">{{ catLabel(c) }}</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label>{{ t('m.title') }} <span class="req">*</span></label>
            <input v-model="createForm.title" :placeholder="t('m.titlePh')" maxlength="60" />
            <span class="char-count">{{ createForm.title.length }}/60</span>
          </div>
          <div class="field">
            <label>{{ t('m.descLab') }} <span class="req">*</span></label>
            <textarea v-model="createForm.description" :placeholder="t('mp.descPh')" rows="4" maxlength="500"></textarea>
            <span class="char-count">{{ createForm.description.length }}/500</span>
          </div>
          <div class="field">
            <label>{{ t('m.budgetLab') }}</label>
            <input v-model="createForm.budget" :placeholder="t('m.budgetPh')" />
          </div>
          <div class="field">
            <label>{{ t('m.contactLab') }} <span class="req">*</span></label>
            <input v-model="createForm.contact" :placeholder="t('m.contactPh')" />
          </div>
          <div class="field">
            <label>{{ t('m.images') }}</label>
            <div class="img-grid">
              <div v-for="(url, i) in createImg.previews.value" :key="i" class="img-thumb">
                <img :src="url" />
                <button type="button" class="img-remove" @click="removeFile(createImg, i)">✕</button>
              </div>
              <label v-if="createImg.previews.value.length < 5" class="img-add">
                <input type="file" accept="image/*" multiple style="display:none" @change="addFiles(createImg, $event)" />
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </label>
            </div>
          </div>
          <div v-if="createError" class="form-error">{{ createError }}</div>
          <button class="submit-btn" :disabled="creating" @click="submitCreate">
            {{ creating ? t('m.publishing') : t('mp.create') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 编辑弹窗 -->
  <Transition name="modal">
    <div v-if="showEdit" class="modal-mask">
      <div class="modal-box">
        <div class="modal-head">
          <h2>{{ t('mp.editTitle') }}</h2>
          <button class="close-btn" @click="showEdit = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('m.type') }} <span class="req">*</span></label>
            <div class="radio-group">
              <label v-for="c in FORM_CATEGORIES" :key="c" class="radio-item">
                <input type="radio" :value="c" v-model="editForm.category" />
                <span :style="CAT_STYLE[c]" class="radio-label">{{ catLabel(c) }}</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label>{{ t('m.title') }} <span class="req">*</span></label>
            <input v-model="editForm.title" maxlength="60" />
            <span class="char-count">{{ editForm.title.length }}/60</span>
          </div>
          <div class="field">
            <label>{{ t('m.descLab') }} <span class="req">*</span></label>
            <textarea v-model="editForm.description" rows="4" maxlength="500"></textarea>
            <span class="char-count">{{ editForm.description.length }}/500</span>
          </div>
          <div class="field">
            <label>{{ t('m.budgetLab') }}</label>
            <input v-model="editForm.budget" />
          </div>
          <div class="field">
            <label>{{ t('m.contactLab') }} <span class="req">*</span></label>
            <input v-model="editForm.contact" />
          </div>
          <div class="field">
            <label>{{ t('m.images') }}</label>
            <div class="img-grid">
              <div v-for="(img, i) in editExistingImgs" :key="img.id" class="img-thumb">
                <img :src="img.url" />
                <button type="button" class="img-remove" @click="removeExistingImg(i)">✕</button>
              </div>
              <div v-for="(url, i) in editImg.previews.value" :key="'n'+i" class="img-thumb">
                <img :src="url" />
                <button type="button" class="img-remove" @click="removeFile(editImg, i)">✕</button>
              </div>
              <label v-if="editExistingImgs.length + editImg.previews.value.length < 5" class="img-add">
                <input type="file" accept="image/*" multiple style="display:none" @change="addFiles(editImg, $event)" />
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </label>
            </div>
          </div>
          <div v-if="editError" class="form-error">{{ editError }}</div>
          <button class="submit-btn" :disabled="editing" @click="submitEdit">
            {{ editing ? t('mp.saving') : t('mp.save') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.my-posts-page { min-height: 100vh; background: #f5f5f7; }
.inner { max-width: 720px; margin: 0 auto; padding: 32px 24px 80px; }

.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
.back-btn    { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: none; color: #6e6e73; font-size: 14px; font-family: inherit; cursor: pointer; padding: 0; transition: color 0.15s; flex-shrink: 0; }
.back-btn:hover { color: #1d1d1f; }
.page-title  { font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.03em; flex: 1; }
.create-btn  { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: #1d1d1f; color: #fff; border: none; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
.create-btn:hover { background: #3a3a3c; }

.state-box  { text-align: center; padding: 60px 0; color: #6e6e73; display: flex; flex-direction: column; align-items: center; }
.spinner    { width: 32px; height: 32px; border: 2px solid rgba(0,0,0,0.08); border-top-color: #6e6e73; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 40px; }

.post-list { display: flex; flex-direction: column; gap: 12px; }
.post-row  { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; padding: 20px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.row-top   { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.badge     { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-tag    { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-active { background: rgba(34,197,94,.12); color: #16a34a; }
.status-done   { background: rgba(107,114,128,.12); color: #6b7280; }
.row-time  { font-size: 12px; color: #aeaeb2; margin-left: auto; }
.row-title { font-size: 16px; font-weight: 600; color: #1d1d1f; margin-bottom: 6px; }
.row-desc  { font-size: 13px; color: #6e6e73; line-height: 1.6; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.act-btn { padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: transparent; color: #6e6e73; font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.act-btn:hover:not(:disabled) { border-color: rgba(0,0,0,0.2); color: #1d1d1f; }
.act-btn.danger { border-color: rgba(255,59,48,0.2); color: #ff3b30; }
.act-btn.danger:hover:not(:disabled) { background: rgba(255,59,48,0.06); }
.act-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box  { background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(0,0,0,0.18); }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 0; }
.modal-head h2 { font-size: 18px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; }
.close-btn  { background: rgba(0,0,0,0.06); border: none; color: #6e6e73; font-size: 13px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.close-btn:hover { background: rgba(0,0,0,0.1); color: #1d1d1f; }
.modal-body { padding: 20px 24px 28px; display: flex; flex-direction: column; gap: 16px; }
.field      { display: flex; flex-direction: column; gap: 6px; position: relative; }
.field label { font-size: 12px; color: #6e6e73; letter-spacing: 0.04em; }
.req        { color: #ff3b30; }
.field input, .field textarea { background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; resize: none; }
.field input:focus, .field textarea:focus { border-color: rgba(0,0,0,0.25); }
.field input::placeholder, .field textarea::placeholder { color: #c7c7cc; }
.char-count { font-size: 11px; color: #aeaeb2; text-align: right; margin-top: -4px; }
.radio-group { display: flex; flex-wrap: wrap; gap: 8px; }
.radio-item  { display: flex; align-items: center; cursor: pointer; }
.radio-item input[type=radio] { display: none; }
.radio-label { font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 100px; cursor: pointer; border: 1px solid transparent; transition: opacity 0.15s; }
.radio-item input:checked + .radio-label { outline: 2px solid rgba(0,0,0,0.25); }
.form-error { background: rgba(255,59,48,0.08); border: 1px solid rgba(255,59,48,0.2); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff3b30; }
.submit-btn { width: 100%; padding: 13px; background: #1d1d1f; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; }
.submit-btn:hover:not(:disabled) { background: #3a3a3c; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* Image upload */
.img-grid  { display: flex; flex-wrap: wrap; gap: 8px; }
.img-thumb { position: relative; width: 76px; height: 76px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-remove { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
.img-add { width: 76px; height: 76px; border: 1.5px dashed rgba(0,0,0,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #aeaeb2; transition: border-color 0.15s, color 0.15s; flex-shrink: 0; }
.img-add:hover { border-color: rgba(0,0,0,0.3); color: #6e6e73; }
</style>
