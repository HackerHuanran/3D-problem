<template>
  <view class="page">
    <view class="hero-card">
      <text class="hero-kicker">3D打印问题库</text>
      <text class="hero-title">小程序端第一版入口</text>
      <text class="hero-desc">先做移动端高频动作：搜索问题、快速初筛、查看步骤。</text>
      <view class="account-row">
        <text v-if="user">当前账号：{{ user.username }}</text>
        <text v-else>当前未登录</text>
        <button class="ghost-btn" @click="openAccount">{{ user ? '账号中心' : '登录 / 找回密码' }}</button>
      </view>
      <view class="hero-actions">
        <button class="primary-btn" @click="goDiagnosis">去做初筛</button>
      </view>
    </view>

    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">直接搜索问题</text>
        <text class="panel-meta">共 {{ filtered.length }} 条</text>
      </view>

      <input
        v-model="query"
        class="search-input"
        placeholder="搜索翘边、拉丝、堵嘴、层移…"
      />

      <scroll-view class="chip-row" scroll-x>
        <view
          v-for="category in categories"
          :key="category"
          :class="['chip', { active: activeCategory === category }]"
          @click="activeCategory = category"
        >
          {{ category }}
        </view>
      </scroll-view>

      <view class="list">
        <view
          v-for="problem in visibleList"
          :key="problem.id"
          class="problem-card"
          @click="openDetail(problem.id)"
        >
          <view class="problem-top">
            <text class="problem-title">{{ problem.title }}</text>
            <text class="problem-badge">{{ problem.category }}</text>
          </view>
          <text class="problem-sub">{{ problem.subtitle }}</text>
          <view class="problem-meta">
            <text v-if="problem.stages?.length">{{ problem.stages[0] }}</text>
            <text v-if="problem.estimatedTime">{{ problem.estimatedTime }}</text>
            <text v-if="favoriteSet.has(problem.id)">已收藏</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="historyCards.length" class="panel">
      <view class="panel-head">
        <text class="panel-title">最近浏览</text>
        <text class="panel-meta">{{ historyCards.length }} 条</text>
      </view>

      <view class="list">
        <view
          v-for="item in historyCards"
          :key="item.id"
          class="problem-card"
          @click="openDetail(item.id)"
        >
          <view class="problem-top">
            <text class="problem-title">{{ item.title }}</text>
            <text class="problem-badge">最近浏览</text>
          </view>
          <text class="problem-sub">{{ item.subtitle }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { currentUser, initMiniappAuth } from '../../lib/auth.js'
import { favoriteIds, fetchMiniappFavorites, fetchMiniappHistory, recentHistory } from '../../lib/user-data.js'
import {
  getMiniappCategories,
  getMiniappProblemDetail,
  listMiniappProblems,
  listMiniappProblemsRemote,
} from '../../lib/problem-service.js'

const query = ref('')
const activeCategory = ref('全部')
const categories = getMiniappCategories()
const remoteList = ref([])
const user = currentUser

const favoriteSet = computed(() => new Set(favoriteIds.value))

const filtered = computed(() =>
  remoteList.value.length
    ? remoteList.value
    : listMiniappProblems({
        query: query.value,
        category: activeCategory.value,
      }),
)

const visibleList = computed(() => filtered.value.slice(0, 24))
const historyCards = computed(() =>
  recentHistory.value
    .map((item) => getMiniappProblemDetail(item.problemId))
    .filter(Boolean)
    .slice(0, 8),
)

async function loadRemoteList() {
  remoteList.value = await listMiniappProblemsRemote({
    query: query.value,
    category: activeCategory.value,
    page: 1,
    pageSize: 24,
  })
}

function openDetail(id) {
  uni.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
}

function goDiagnosis() {
  uni.navigateTo({ url: '/pages/diagnosis/index' })
}

function openAccount() {
  uni.navigateTo({ url: '/pages/account/index' })
}

watch([query, activeCategory], () => {
  loadRemoteList()
})

onMounted(async () => {
  await initMiniappAuth()
  await loadRemoteList()
  if (user.value?.id) {
    await Promise.all([
      fetchMiniappFavorites(user.value.id),
      fetchMiniappHistory(user.value.id),
    ])
  }
})
</script>

<style scoped>
.page {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.hero-card,
.panel,
.problem-card {
  background: rgba(250, 252, 255, 0.96);
  border: 1rpx solid rgba(34, 56, 89, 0.08);
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(21, 42, 77, 0.06);
}

.hero-card {
  padding: 32rpx;
  background: linear-gradient(145deg, #fdfefe 0%, #edf4fb 100%);
}

.hero-kicker {
  font-size: 24rpx;
  color: #68829f;
}

.hero-title {
  margin-top: 12rpx;
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: #132033;
}

.hero-desc {
  margin-top: 12rpx;
  display: block;
  font-size: 26rpx;
  line-height: 1.7;
  color: #566b84;
}

.hero-actions {
  margin-top: 24rpx;
}

.account-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  font-size: 24rpx;
  color: #627892;
}

.primary-btn {
  background: linear-gradient(135deg, #2568e8 0%, #18b5d4 100%);
  color: #fff;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
}

.ghost-btn {
  background: rgba(37, 104, 232, 0.08);
  color: #2568e8;
  border: none;
  border-radius: 999rpx;
  font-size: 24rpx;
  padding: 0 24rpx;
}

.panel {
  padding: 28rpx;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.panel-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #132033;
}

.panel-meta {
  font-size: 24rpx;
  color: #7a8fa8;
}

.search-input {
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 20rpx;
  background: #eef4fb;
  font-size: 28rpx;
  color: #132033;
}

.chip-row {
  margin-top: 20rpx;
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 22rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background: #edf2f7;
  color: #5f748e;
  font-size: 24rpx;
}

.chip.active {
  background: rgba(37, 104, 232, 0.12);
  color: #2568e8;
}

.list {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.problem-card {
  padding: 24rpx;
}

.problem-top {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.problem-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
  color: #132033;
}

.problem-badge {
  flex-shrink: 0;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(24, 181, 212, 0.12);
  color: #127b91;
  font-size: 22rpx;
}

.problem-sub {
  margin-top: 12rpx;
  display: block;
  font-size: 25rpx;
  line-height: 1.7;
  color: #5d718a;
}

.problem-meta {
  margin-top: 16rpx;
  display: flex;
  gap: 16rpx;
  font-size: 22rpx;
  color: #8092a9;
}
</style>
