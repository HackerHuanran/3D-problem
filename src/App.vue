<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from './composables/useAuth.js'
import ProblemsView from './components/ProblemsView.vue'
import ProblemDetailView from './components/ProblemDetailView.vue'
import NewsView from './components/NewsView.vue'
import MarketView from './components/MarketView.vue'

const { currentUser, checkUsername, requestPhoneCode, confirmCode, login, setupProfile, changePassword, logout, init } = useAuth()

onMounted(() => init())

// ── 页面导航 ──
const currentPage     = ref('list')
const currentDetailId = ref(null)
const activeTab       = ref('home')

const goToDetail = (id) => { currentDetailId.value = id; currentPage.value = 'detail'; window.scrollTo(0, 0) }
const goBackToList = () => { currentPage.value = 'list'; activeTab.value = 'home'; currentDetailId.value = null; window.scrollTo(0, 0) }
const switchTab = (tab) => { activeTab.value = tab; currentPage.value = 'list'; window.scrollTo(0, 0) }

// ── 用户菜单 ──
const showUserMenu = ref(false)

// ── 登录/注册弹窗 ──
const showAuthModal = ref(false)
const authMode      = ref('login')  // 'login' | 'register'
const authForm      = ref({ username: '', phone: '', password: '', code: '' })
const authError     = ref('')
const authLoading   = ref(false)
const codeSent      = ref(false)
const countdown     = ref(0)
let   countdownTimer = null
let   verifyOtpFn    = null

const openAuth = (mode = 'login') => {
  authMode.value    = mode
  authError.value   = ''
  authForm.value    = { username: '', phone: '', password: '', code: '' }
  codeSent.value    = false
  countdown.value   = 0
  verifyOtpFn       = null
  showUserMenu.value = false
  clearInterval(countdownTimer)
  showAuthModal.value = true
}
const closeAuth = () => { showAuthModal.value = false; verifyOtpFn = null; clearInterval(countdownTimer) }

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => { countdown.value--; if (countdown.value <= 0) clearInterval(countdownTimer) }, 1000)
}

const handleSendCode = async () => {
  authError.value = ''
  const { username, phone, password } = authForm.value
  if (!phone.trim()) { authError.value = '请输入手机号'; return }
  if (!password || password.length < 6) { authError.value = '密码至少6位'; return }
  if (!username.trim()) { authError.value = '请输入用户名'; return }
  try { await checkUsername(username.trim()) } catch (e) { authError.value = e.message; return }
  authLoading.value = true
  try {
    verifyOtpFn    = await requestPhoneCode(phone.trim(), password)
    codeSent.value = true
    startCountdown()
  } catch (e) {
    authError.value = e.message || String(e)
  } finally {
    authLoading.value = false
  }
}

const submitAuth = async () => {
  authError.value = ''
  authLoading.value = true
  try {
    const { username, phone, code, password } = authForm.value
    if (authMode.value === 'register') {
      if (!code.trim()) { authError.value = '请输入验证码'; return }
      await confirmCode(verifyOtpFn, code.trim(), username.trim(), phone.trim())
    } else {
      if (!phone.trim()) { authError.value = '请输入手机号'; return }
      if (!password)     { authError.value = '请输入密码'; return }
      await login(phone.trim(), password)
    }
    closeAuth()
  } catch (e) {
    authError.value = e.message || e.error_description || String(e)
  } finally {
    authLoading.value = false
  }
}

// ── 修改密码弹窗 ──
const showChangePwd   = ref(false)
const changePwdForm   = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const changePwdError  = ref('')
const changePwdLoading = ref(false)

const openChangePwd = () => {
  showUserMenu.value    = false
  changePwdForm.value   = { oldPassword: '', newPassword: '', confirmPassword: '' }
  changePwdError.value  = ''
  showChangePwd.value   = true
}
const closeChangePwd = () => { showChangePwd.value = false }

const submitChangePwd = async () => {
  changePwdError.value = ''
  const { oldPassword, newPassword, confirmPassword } = changePwdForm.value
  if (!oldPassword)                           { changePwdError.value = '请输入原密码'; return }
  if (newPassword.length < 6)                 { changePwdError.value = '新密码至少6位'; return }
  if (newPassword !== confirmPassword)        { changePwdError.value = '两次密码不一致'; return }
  changePwdLoading.value = true
  try {
    await changePassword(oldPassword, newPassword)
    closeChangePwd()
  } catch (e) {
    changePwdError.value = e.message || String(e)
  } finally {
    changePwdLoading.value = false
  }
}

// ── 积分弹窗 ──
const showPoints = ref(false)
const openPoints = () => { showUserMenu.value = false; showPoints.value = true }

const handleLogout = async () => { showUserMenu.value = false; await logout() }

// ── 修改用户名弹窗 ──
const showEditUsername   = ref(false)
const editUsernameForm   = ref({ username: '' })
const editUsernameError  = ref('')
const editUsernameLoading = ref(false)

const openEditUsername = () => {
  showUserMenu.value       = false
  editUsernameForm.value   = { username: currentUser.value?.username || '' }
  editUsernameError.value  = ''
  showEditUsername.value   = true
}

const submitEditUsername = async () => {
  editUsernameError.value = ''
  if (!editUsernameForm.value.username.trim()) { editUsernameError.value = '请输入用户名'; return }
  editUsernameLoading.value = true
  try {
    await setupProfile(editUsernameForm.value.username.trim())
    showEditUsername.value = false
  } catch (e) {
    editUsernameError.value = e.message || String(e)
  } finally {
    editUsernameLoading.value = false
  }
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
            <!-- 用户菜单 -->
            <div class="user-wrap">
              <div class="nav-user" @click="showUserMenu = !showUserMenu">
                <div class="user-avatar">{{ currentUser.avatar }}</div>
                <span class="user-name">{{ currentUser.username }}</span>
                <span class="menu-caret" :class="{ open: showUserMenu }">▾</span>
              </div>
              <Transition name="dropdown">
                <div v-if="showUserMenu" class="user-dropdown">
                  <button class="dropdown-item" @click="openEditUsername">修改用户名</button>
                  <button class="dropdown-item" @click="openChangePwd">修改密码</button>
                  <button class="dropdown-item" @click="openPoints">积分</button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item danger" @click="handleLogout">退出登录</button>
                </div>
              </Transition>
            </div>
            <!-- 点击遮罩关闭菜单 -->
            <div v-if="showUserMenu" class="menu-backdrop" @click="showUserMenu = false"></div>
          </template>
        </div>
      </div>
    </nav>

    <div class="tab-bar">
      <div class="tab-bar-inner">
        <button :class="['tab-item', { active: activeTab === 'home' }]"   @click="switchTab('home')">首页</button>
        <button :class="['tab-item', { active: activeTab === 'news' }]"   @click="switchTab('news')">新闻资讯</button>
        <button :class="['tab-item', { active: activeTab === 'market' }]" @click="switchTab('market')">市场</button>
      </div>
    </div>

    <ProblemsView v-if="activeTab === 'home'"   @go-detail="goToDetail" @open-auth="openAuth" />
    <NewsView     v-else-if="activeTab === 'news'" />
    <MarketView   v-else-if="activeTab === 'market'" :current-user="currentUser" @open-auth="openAuth" />
  </div>

  <!-- 登录/注册弹窗 -->
  <Transition name="modal">
    <div v-if="showAuthModal" class="modal-mask">
      <div class="modal-box">
        <div class="modal-tabs">
          <button :class="['tab', { active: authMode === 'login' }]"    @click="authMode = 'login';    authError = ''">登录</button>
          <button :class="['tab', { active: authMode === 'register' }]" @click="authMode = 'register'; authError = ''; codeSent = false">注册</button>
        </div>
        <div class="modal-body">
          <!-- 登录 -->
          <template v-if="authMode === 'login'">
            <h2 class="modal-title">欢迎回来</h2>
            <p class="modal-sub">用手机号和密码登录</p>
            <div class="form-fields">
              <div class="field">
                <label>手机号</label>
                <input v-model="authForm.phone" type="tel" placeholder="注册时的手机号" required @keyup.enter="submitAuth" />
              </div>
              <div class="field">
                <label>密码</label>
                <input v-model="authForm.password" type="password" placeholder="登录密码" required @keyup.enter="submitAuth" />
              </div>
            </div>
          </template>

          <!-- 注册 -->
          <template v-else>
            <h2 class="modal-title">加入社区</h2>
            <p class="modal-sub">填写信息后获取短信验证码完成注册</p>
            <div class="form-fields">
              <div class="field">
                <label>用户名</label>
                <input v-model="authForm.username" placeholder="如：打印达人007" required :disabled="codeSent" />
              </div>
              <div class="field">
                <label>密码</label>
                <input v-model="authForm.password" type="password" placeholder="至少6位" required :disabled="codeSent" />
              </div>
              <div class="field">
                <label>手机号</label>
                <div class="phone-row">
                  <input v-model="authForm.phone" type="tel" placeholder="手机号" class="phone-input" required :disabled="codeSent" />
                  <button class="send-btn" :disabled="authLoading || countdown > 0 || !authForm.username.trim() || !authForm.phone.trim() || !authForm.password || authForm.password.length < 6" @click="handleSendCode">
                    {{ countdown > 0 ? countdown + 's' : (codeSent ? '重新发送' : '获取验证码') }}
                  </button>
                </div>
              </div>
              <div v-if="codeSent" class="field">
                <label>短信验证码</label>
                <input v-model="authForm.code" placeholder="6位验证码" maxlength="6" required @keyup.enter="submitAuth" autofocus />
              </div>
            </div>
          </template>

          <div v-if="authError" class="auth-error">{{ authError }}</div>
          <button
            class="submit-btn"
            :class="{ loading: authLoading }"
            @click="submitAuth"
            :disabled="authLoading || (authMode === 'register' && (!codeSent || !authForm.code.trim())) || (authMode === 'login' && (!authForm.phone.trim() || !authForm.password))"
          >
            <span v-if="authLoading" class="btn-spinner"></span>
            {{ authLoading ? '请稍候…' : (authMode === 'login' ? '登录' : '完成注册') }}
          </button>
        </div>
        <button class="modal-close" @click="closeAuth">✕</button>
      </div>
    </div>
  </Transition>

  <!-- 修改密码弹窗 -->
  <Transition name="modal">
    <div v-if="showChangePwd" class="modal-mask">
      <div class="modal-box">
        <div class="modal-body" style="padding-top:32px">
          <h2 class="modal-title">修改密码</h2>
          <p class="modal-sub">修改后需重新登录</p>
          <div class="form-fields">
            <div class="field">
              <label>原密码</label>
              <input v-model="changePwdForm.oldPassword" type="password" placeholder="当前密码" required @keyup.enter="submitChangePwd" />
            </div>
            <div class="field">
              <label>新密码</label>
              <input v-model="changePwdForm.newPassword" type="password" placeholder="至少6位" required @keyup.enter="submitChangePwd" />
            </div>
            <div class="field">
              <label>确认新密码</label>
              <input v-model="changePwdForm.confirmPassword" type="password" placeholder="再次输入新密码" required @keyup.enter="submitChangePwd" />
            </div>
          </div>
          <div v-if="changePwdError" class="auth-error">{{ changePwdError }}</div>
          <button class="submit-btn" :class="{ loading: changePwdLoading }" @click="submitChangePwd" :disabled="changePwdLoading">
            <span v-if="changePwdLoading" class="btn-spinner"></span>
            {{ changePwdLoading ? '请稍候…' : '确认修改' }}
          </button>
        </div>
        <button class="modal-close" @click="closeChangePwd">✕</button>
      </div>
    </div>
  </Transition>

  <!-- 修改用户名弹窗 -->
  <Transition name="modal">
    <div v-if="showEditUsername" class="modal-mask">
      <div class="modal-box">
        <div class="modal-body" style="padding-top:32px">
          <h2 class="modal-title">修改用户名</h2>
          <p class="modal-sub">修改后将在评论和市场中显示新名称</p>
          <div class="form-fields">
            <div class="field">
              <label>用户名</label>
              <input v-model="editUsernameForm.username" placeholder="如：打印达人007" @keyup.enter="submitEditUsername" autofocus />
            </div>
          </div>
          <div v-if="editUsernameError" class="auth-error">{{ editUsernameError }}</div>
          <button class="submit-btn" :class="{ loading: editUsernameLoading }" @click="submitEditUsername" :disabled="editUsernameLoading">
            <span v-if="editUsernameLoading" class="btn-spinner"></span>
            {{ editUsernameLoading ? '请稍候…' : '确认修改' }}
          </button>
        </div>
        <button class="modal-close" @click="showEditUsername = false">✕</button>
      </div>
    </div>
  </Transition>

  <!-- 积分弹窗 -->
  <Transition name="modal">
    <div v-if="showPoints" class="modal-mask" @click.self="showPoints = false">
      <div class="modal-box">
        <div class="modal-body" style="padding-top:32px;text-align:center">
          <h2 class="modal-title">我的积分</h2>
          <div class="points-display">
            <span class="points-value">{{ currentUser?.points ?? 0 }}</span>
            <span class="points-unit">积分</span>
          </div>
          <p class="modal-sub" style="margin-top:12px">发布内容和参与互动可获得积分</p>
        </div>
        <button class="modal-close" @click="showPoints = false">✕</button>
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
.nav-right { display: flex; align-items: center; gap: 8px; position: relative; }
.nav-btn { border-radius: 100px; font-size: 13px; cursor: pointer; font-family: inherit; padding: 6px 16px; transition: all 0.18s; border: 1px solid transparent; }
.nav-btn.ghost { background: transparent; border-color: rgba(255,255,255,0.15); color: #aeaeb2; }
.nav-btn.ghost:hover { border-color: rgba(255,255,255,0.3); color: #f5f5f7; }
.nav-btn.solid { background: #f5f5f7; color: #1d1d1f; border-color: #f5f5f7; font-weight: 500; }
.nav-btn.solid:hover { background: #e5e5e7; }

/* 用户菜单 */
.user-wrap { position: relative; }
.nav-user { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 100px; transition: background 0.15s; user-select: none; }
.nav-user:hover { background: rgba(255,255,255,0.06); }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-name { font-size: 14px; color: #e5e5ea; }
.menu-caret { font-size: 11px; color: #6e6e73; transition: transform 0.2s; }
.menu-caret.open { transform: rotate(180deg); }

.user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #2c2c2e; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 14px; min-width: 140px; overflow: hidden; z-index: 300; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
.dropdown-item { width: 100%; padding: 12px 16px; background: transparent; border: none; color: #e5e5ea; font-size: 14px; font-family: inherit; text-align: left; cursor: pointer; transition: background 0.15s; }
.dropdown-item:hover { background: rgba(255,255,255,0.06); }
.dropdown-item.danger { color: #ff6b6b; }
.dropdown-divider { height: 0.5px; background: rgba(255,255,255,0.08); margin: 2px 0; }
.menu-backdrop { position: fixed; inset: 0; z-index: 250; }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

.tab-bar { position: sticky; top: 52px; z-index: 199; background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); border-bottom: 0.5px solid rgba(255,255,255,0.08); }
.tab-bar-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 2px; }
.tab-item { padding: 0 14px; height: 42px; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -0.5px; color: #6e6e73; font-size: 14px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all 0.15s; }
.tab-item:hover { color: #aeaeb2; }
.tab-item.active { color: #f5f5f7; border-bottom-color: #f5f5f7; }

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
.field input:disabled { opacity: 0.5; cursor: not-allowed; }
.phone-row { display: flex; gap: 8px; }
.phone-input { flex: 1; background: #2c2c2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 11px 14px; color: #f5f5f7; font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.phone-input:focus { border-color: rgba(255,255,255,0.25); }
.phone-input::placeholder { color: #48484a; }
.phone-input:disabled { opacity: 0.5; }
.send-btn { flex-shrink: 0; padding: 11px 14px; background: #2c2c2e; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; color: #aeaeb2; font-size: 13px; font-family: inherit; cursor: pointer; white-space: nowrap; transition: all 0.18s; }
.send-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.3); color: #f5f5f7; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.auth-error { background: rgba(232,92,92,0.12); border: 0.5px solid rgba(232,92,92,0.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff6b6b; margin-bottom: 14px; }
.submit-btn { width: 100%; padding: 13px; background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.submit-btn:hover:not(:disabled) { background: #e5e5e7; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #3a3a3c; color: #86868b; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.12); border-top-color: #86868b; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-close { position: absolute; top: 14px; right: 16px; background: transparent; border: none; color: #48484a; font-size: 16px; cursor: pointer; padding: 4px; transition: color 0.15s; }
.modal-close:hover { color: #86868b; }
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* 积分 */
.points-display { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin: 24px 0 4px; }
.points-value { font-size: 56px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.04em; }
.points-unit { font-size: 18px; color: #86868b; }
</style>
