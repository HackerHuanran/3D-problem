<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from './composables/useAuth.js'
import ProblemsView from './components/ProblemsView.vue'
import ProblemDetailView from './components/ProblemDetailView.vue'

const { currentUser, login, register, logout, init } = useAuth()

// 页面加载时恢复登录状态
onMounted(() => init())

// ── 页面导航 ──
const currentPage = ref('list')
const currentDetailId = ref(null)

const goToDetail = (id) => {
  currentDetailId.value = id
  currentPage.value = 'detail'
  window.scrollTo(0, 0)
}
const goBackToList = () => {
  currentPage.value = 'list'
  currentDetailId.value = null
  window.scrollTo(0, 0)
}

// ── 登录/注册弹窗 ──
const showAuthModal = ref(false)
const authMode = ref('login')
const authForm = ref({ username: '', email: '', password: '' })
const authError = ref('')
const authLoading = ref(false)

const openAuth = (mode = 'login') => {
  authMode.value = mode
  authError.value = ''
  authForm.value = { username: '', email: '', password: '' }
  showAuthModal.value = true
}

const closeAuth = () => { showAuthModal.value = false }

const submitAuth = async () => {
  authError.value = ''
  const { username, email, password } = authForm.value
  if (!email || !password) { authError.value = '请填写完整信息'; return }
  if (authMode.value === 'register' && !username) { authError.value = '请填写用户名'; return }
  if (password.length < 6) { authError.value = '密码至少6位'; return }

  authLoading.value = true
  try {
    if (authMode.value === 'register') {
      await register(username, email, password)
      // 注册后 Supabase 默认需要邮箱验证，可在控制台关闭此选项
      authError.value = ''
      closeAuth()
    } else {
      await login(email, password)
      closeAuth()
    }
  } catch (e) {
    authError.value = e.message
  } finally {
    authLoading.value = false
  }
}
const handleLogout = async () => {
  console.log('currentUser before:', currentUser.value)
  await logout()
  console.log('currentUser after:', currentUser.value)
}
</script>

<template>
  <ProblemDetailView
    v-if="currentPage === 'detail'"
    :problem-id="currentDetailId"
    @back="goBackToList"
    @go-detail="goToDetail"
    @open-auth="openAuth"
  />

  <div v-else class="app-shell">
    <nav class="app-nav">
      <div class="nav-inner">
        <div class="nav-logo" @click="goBackToList">
          <span class="logo-mark">▲</span>
          <span class="logo-text">3D 故障库</span>
        </div>
        <div class="nav-right">
          <template v-if="!currentUser">
            <button class="nav-btn ghost" @click="openAuth('login')">登录</button>
            <button class="nav-btn solid" @click="openAuth('register')">注册</button>
          </template>
          <template v-else>
            <div class="nav-user">
              <div class="user-avatar">{{ currentUser.avatar }}</div>
              <span class="user-name">{{ currentUser.username }}</span>
<button class="nav-btn ghost small" @click="handleLogout">退出</button>
            </div>
          </template>
        </div>
      </div>
    </nav>
    <ProblemsView @go-detail="goToDetail" @open-auth="openAuth" />
  </div>

  <!-- 登录/注册弹窗 -->
  <Transition name="modal">
    <div v-if="showAuthModal" class="modal-mask" @click.self="closeAuth">
      <div class="modal-box">
        <div class="modal-tabs">
          <button :class="['tab', { active: authMode === 'login' }]" @click="authMode = 'login'; authError = ''">登录</button>
          <button :class="['tab', { active: authMode === 'register' }]" @click="authMode = 'register'; authError = ''">注册</button>
        </div>
        <div class="modal-body">
          <h2 class="modal-title">{{ authMode === 'login' ? '欢迎回来' : '加入社区' }}</h2>
          <p class="modal-sub">{{ authMode === 'login' ? '登录后可评论和分享解决方案' : '注册后参与讨论，分享你的打印经验' }}</p>
          <div class="form-fields">
            <div v-if="authMode === 'register'" class="field">
              <label>用户名</label>
              <input v-model="authForm.username" placeholder="如：打印达人007" @keyup.enter="submitAuth" />
            </div>
            <div class="field">
              <label>邮箱</label>
              <input v-model="authForm.email" type="email" placeholder="your@email.com" @keyup.enter="submitAuth" />
            </div>
            <div class="field">
              <label>密码</label>
              <input v-model="authForm.password" type="password" placeholder="至少6位" @keyup.enter="submitAuth" />
            </div>
          </div>
          <div v-if="authError" class="auth-error">{{ authError }}</div>
          <button class="submit-btn" :class="{ loading: authLoading }" @click="submitAuth" :disabled="authLoading">
            {{ authLoading ? '请稍候…' : (authMode === 'login' ? '登录' : '注册') }}
          </button>
          <p class="modal-tip" v-if="authMode === 'register'">
            注册后请查收邮箱验证邮件（如未收到请检查垃圾箱）
          </p>
        </div>
        <button class="modal-close" @click="closeAuth">✕</button>
      </div>
    </div>
  </Transition>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif; }
</style>

<style scoped>
.app-shell { min-height: 100vh; background: #000; }
.app-nav { position: sticky; top: 0; z-index: 200; background: rgba(0,0,0,0.88); backdrop-filter: blur(20px); border-bottom: 0.5px solid rgba(255,255,255,0.08); height: 52px; }
.nav-inner { max-width: 1200px; margin: 0 auto; height: 100%; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }
.nav-logo { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; transition: opacity 0.15s; }
.nav-logo:hover { opacity: 0.8; }
.logo-mark { font-size: 16px; color: #ff6b6b; }
.logo-text { font-size: 15px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.01em; }
.nav-right { display: flex; align-items: center; gap: 8px; }
.nav-btn { border-radius: 100px; font-size: 13px; cursor: pointer; font-family: inherit; padding: 6px 16px; transition: all 0.18s; border: 1px solid transparent; }
.nav-btn.ghost { background: transparent; border-color: rgba(255,255,255,0.15); color: #aeaeb2; }
.nav-btn.ghost:hover { border-color: rgba(255,255,255,0.3); color: #f5f5f7; }
.nav-btn.solid { background: #f5f5f7; color: #1d1d1f; border-color: #f5f5f7; font-weight: 500; }
.nav-btn.solid:hover { background: #e5e5e7; }
.nav-btn.small { padding: 4px 12px; font-size: 12px; }
.nav-user { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.user-name { font-size: 14px; color: #e5e5ea; }

.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box { background: #1c1c1e; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 24px; width: 100%; max-width: 400px; position: relative; overflow: hidden; }
.modal-tabs { display: flex; border-bottom: 0.5px solid rgba(255,255,255,0.08); }
.tab { flex: 1; padding: 16px; background: transparent; border: none; color: #6e6e73; font-size: 15px; font-family: inherit; cursor: pointer; transition: all 0.18s; border-bottom: 2px solid transparent; margin-bottom: -0.5px; }
.tab.active { color: #f5f5f7; border-bottom-color: #f5f5f7; }
.tab:hover:not(.active) { color: #aeaeb2; }
.modal-body { padding: 28px 28px 32px; }
.modal-title { font-size: 22px; font-weight: 700; color: #f5f5f7; margin-bottom: 6px; letter-spacing: -0.02em; }
.modal-sub { font-size: 13px; color: #6e6e73; margin-bottom: 24px; line-height: 1.5; }
.form-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: #86868b; letter-spacing: 0.04em; }
.field input { background: #2c2c2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 11px 14px; color: #f5f5f7; font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.field input:focus { border-color: rgba(255,255,255,0.25); }
.field input::placeholder { color: #48484a; }
.auth-error { background: rgba(232,92,92,0.12); border: 0.5px solid rgba(232,92,92,0.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff6b6b; margin-bottom: 14px; }
.submit-btn { width: 100%; padding: 13px; background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; }
.submit-btn:hover:not(:disabled) { background: #e5e5e7; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #3a3a3c; color: #86868b; }
.modal-tip { font-size: 12px; color: #48484a; text-align: center; margin-top: 12px; line-height: 1.5; }
.modal-close { position: absolute; top: 14px; right: 16px; background: transparent; border: none; color: #48484a; font-size: 16px; cursor: pointer; padding: 4px; transition: color 0.15s; }
.modal-close:hover { color: #86868b; }
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
