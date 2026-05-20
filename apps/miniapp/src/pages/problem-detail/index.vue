<template>
  <view class="page" v-if="detail">
    <view class="hero-card">
      <text class="title">{{ detail.title }}</text>
      <text class="subtitle">{{ detail.subtitle }}</text>
      <view class="meta-row">
        <text class="meta-pill">{{ detail.category }}</text>
        <text v-if="detail.estimatedTime" class="meta-pill">{{ detail.estimatedTime }}</text>
        <text class="meta-pill action" @click="toggleFavorite">{{ isFav ? '已收藏' : '收藏' }}</text>
      </view>
    </view>

    <view class="panel">
      <text class="section-title">常见原因</text>
      <view class="bullet-list">
        <view v-for="(cause, index) in detail.causes || []" :key="index" class="bullet-item">
          <text class="bullet-dot"></text>
          <text class="bullet-text">{{ cause }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <text class="section-title">解决步骤</text>
      <view class="step-list">
        <view v-for="step in detail.solutions || []" :key="step.step" class="step-card">
          <text class="step-index">步骤 {{ step.step }}</text>
          <text class="step-title">{{ step.title }}</text>
          <text class="step-detail">{{ step.detail }}</text>
        </view>
      </view>
    </view>

    <view v-if="detail.tips" class="panel">
      <text class="section-title">补充提醒</text>
      <text class="tips">{{ detail.tips }}</text>
    </view>

    <view v-if="relatedProblems.length" class="panel">
      <text class="section-title">相关问题</text>
      <view class="related-list">
        <view
          v-for="item in relatedProblems"
          :key="item.id"
          class="related-card"
          @click="openRelated(item.id)"
        >
          <text class="related-title">{{ item.title }}</text>
          <text class="related-sub">{{ item.subtitle }}</text>
        </view>
      </view>
    </view>
  </view>

  <view v-else class="page">
    <view class="empty-box">
      <text class="empty-title">没找到这个问题</text>
      <text class="empty-desc">可能是参数缺失，或者这个问题还没有同步到小程序端。</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { currentUser } from '../../lib/auth.js'
import { recordMiniappHistory, toggleMiniappFavorite, favoriteIds, fetchMiniappFavorites } from '../../lib/user-data.js'
import { getMiniappProblemDetailRemote, getMiniappRelatedProblems } from '../../lib/problem-service.js'

const detail = ref(null)
const relatedProblems = ref([])
const isFav = ref(false)

onLoad(async (query) => {
  const id = query?.id || ''
  detail.value = await getMiniappProblemDetailRemote(id)
  relatedProblems.value = getMiniappRelatedProblems(id)
  await recordMiniappHistory(id, currentUser.value?.id || '')
  if (currentUser.value?.id) {
    await fetchMiniappFavorites(currentUser.value.id)
    isFav.value = favoriteIds.value.includes(id)
  }
})

function openRelated(id) {
  uni.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
}

async function toggleFavorite() {
  if (!currentUser.value?.id || !detail.value?.id) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    const next = await toggleMiniappFavorite(detail.value.id, currentUser.value.id)
    isFav.value = next
    uni.showToast({ title: next ? '已收藏' : '已取消', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || '收藏失败', icon: 'none' })
  }
}
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
.step-card,
.empty-box,
.related-card {
  background: rgba(250, 252, 255, 0.96);
  border: 1rpx solid rgba(34, 56, 89, 0.08);
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(21, 42, 77, 0.06);
}

.hero-card,
.panel,
.empty-box {
  padding: 28rpx;
}

.title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #132033;
}

.subtitle {
  margin-top: 12rpx;
  display: block;
  font-size: 26rpx;
  line-height: 1.7;
  color: #617791;
}

.meta-row {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.meta-pill {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(37, 104, 232, 0.1);
  color: #2568e8;
  font-size: 22rpx;
}

.meta-pill.action {
  background: rgba(24, 181, 212, 0.12);
  color: #127b91;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #132033;
}

.bullet-list,
.step-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.bullet-item {
  display: flex;
  gap: 14rpx;
  align-items: flex-start;
}

.bullet-dot {
  width: 12rpx;
  height: 12rpx;
  margin-top: 12rpx;
  border-radius: 50%;
  background: #18b5d4;
  flex-shrink: 0;
}

.bullet-text,
.step-detail,
.tips,
.empty-desc {
  font-size: 25rpx;
  line-height: 1.75;
  color: #617791;
}

.step-card {
  padding: 22rpx;
}

.related-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.related-card {
  padding: 22rpx;
}

.related-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #132033;
}

.related-sub {
  margin-top: 10rpx;
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: #617791;
}

.step-index {
  display: block;
  font-size: 22rpx;
  color: #7c8ea6;
}

.step-title {
  margin-top: 10rpx;
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #132033;
}

.step-detail {
  margin-top: 10rpx;
  display: block;
}

.tips {
  margin-top: 18rpx;
  display: block;
}

.empty-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #132033;
}

.empty-desc {
  margin-top: 12rpx;
  display: block;
}
</style>
