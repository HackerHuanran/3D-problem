<template>
  <view class="page">
    <view class="panel">
      <text class="title">{{ user ? '账号中心' : '登录账号' }}</text>
      <text class="desc">
        {{ user ? `当前已登录：${user.username}` : '使用和网站同一套手机号账号体系，收藏会和 web 同步。' }}
      </text>

      <view v-if="!user" class="form">
        <input v-model="phone" class="input" placeholder="手机号" />
        <input v-model="password" class="input" password placeholder="密码" />
        <button class="primary-btn" @click="handleLogin">登录</button>
        <button class="ghost-btn" @click="showReset = !showReset">
          {{ showReset ? '收起找回密码' : '找回密码' }}
        </button>

        <view v-if="showReset" class="reset-box">
          <input v-model="resetPhone" class="input" placeholder="手机号" />
          <input v-model="resetPassword" class="input" password placeholder="新密码" />
          <view class="inline-row">
            <input v-model="resetCode" class="input code-input" placeholder="验证码" />
            <button class="ghost-btn small" @click="handleSendResetCode">获取验证码</button>
          </view>
          <button class="primary-btn" @click="handleResetPassword">重置并登录</button>
        </view>
      </view>

      <view v-else class="user-box">
        <view class="stat-grid">
          <view class="stat-item">
            <text class="stat-num">{{ favoriteIds.length }}</text>
            <text class="stat-label">收藏</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ historyCount }}</text>
            <text class="stat-label">浏览</text>
          </view>
        </view>
        <button class="danger-btn" @click="handleLogout">退出登录</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  confirmMiniappPasswordReset,
  currentUser,
  miniappLogin,
  miniappLogout,
  requestMiniappPasswordReset,
} from '../../lib/auth.js'
import { favoriteIds, fetchMiniappFavorites, fetchMiniappHistory, recentHistory } from '../../lib/user-data.js'

const user = currentUser
const phone = ref('')
const password = ref('')
const showReset = ref(false)
const resetPhone = ref('')
const resetPassword = ref('')
const resetCode = ref('')
const resetContext = ref(null)

const historyCount = computed(() => recentHistory.value.length)

async function handleLogin() {
  try {
    await miniappLogin(phone.value.trim(), password.value)
    await Promise.all([
      fetchMiniappFavorites(user.value.id),
      fetchMiniappHistory(user.value.id),
    ])
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || '登录失败', icon: 'none' })
  }
}

async function handleSendResetCode() {
  try {
    resetContext.value = await requestMiniappPasswordReset(resetPhone.value.trim())
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || '发送失败', icon: 'none' })
  }
}

async function handleResetPassword() {
  try {
    await confirmMiniappPasswordReset(resetContext.value, resetCode.value.trim(), resetPassword.value)
    await Promise.all([
      fetchMiniappFavorites(user.value.id),
      fetchMiniappHistory(user.value.id),
    ])
    uni.showToast({ title: '重置成功', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || '重置失败', icon: 'none' })
  }
}

async function handleLogout() {
  await miniappLogout()
  uni.showToast({ title: '已退出', icon: 'success' })
}
</script>

<style scoped>
.page {
  padding: 24rpx;
}

.panel,
.stat-item,
.reset-box {
  background: rgba(250, 252, 255, 0.96);
  border: 1rpx solid rgba(34, 56, 89, 0.08);
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(21, 42, 77, 0.06);
}

.panel {
  padding: 28rpx;
}

.title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #132033;
}

.desc {
  margin-top: 10rpx;
  display: block;
  font-size: 25rpx;
  line-height: 1.7;
  color: #617791;
}

.form,
.user-box {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.input {
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 20rpx;
  background: #eef4fb;
  font-size: 28rpx;
  color: #132033;
}

.primary-btn,
.ghost-btn,
.danger-btn {
  border-radius: 999rpx;
  border: none;
  font-size: 28rpx;
}

.primary-btn {
  background: linear-gradient(135deg, #2568e8 0%, #18b5d4 100%);
  color: #fff;
}

.ghost-btn {
  background: rgba(37, 104, 232, 0.08);
  color: #2568e8;
}

.ghost-btn.small {
  font-size: 24rpx;
  padding: 0 24rpx;
}

.danger-btn {
  background: rgba(214, 84, 84, 0.12);
  color: #c94141;
}

.inline-row {
  display: flex;
  gap: 14rpx;
  align-items: center;
}

.code-input {
  flex: 1;
}

.reset-box {
  padding: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.stat-item {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.stat-num {
  font-size: 38rpx;
  font-weight: 700;
  color: #132033;
}

.stat-label {
  font-size: 24rpx;
  color: #7287a0;
}
</style>
