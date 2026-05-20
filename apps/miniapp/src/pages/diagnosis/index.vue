<template>
  <view class="page">
    <view class="panel">
      <text class="title">移动端问题初筛</text>
      <text class="desc">这版先做轻量初筛：按阶段、机型、材料快速缩小范围，后面再继续接完整问答诊断树。</text>

      <view class="group">
        <text class="group-label">出问题的阶段</text>
        <view class="chip-wrap">
          <view
            v-for="stage in DIAG_STAGES"
            :key="stage.id"
            :class="['chip', { active: stageId === stage.id }]"
            @click="stageId = stage.id"
          >
            {{ stage.label }}
          </view>
        </view>
      </view>

      <view class="group">
        <text class="group-label">打印方式</text>
        <view class="chip-wrap">
          <view
            v-for="printer in DIAG_PRINTERS"
            :key="printer.id"
            :class="['chip', { active: printerId === printer.id }]"
            @click="printerId = printer.id"
          >
            {{ printer.label }}
          </view>
        </view>
      </view>

      <view class="group">
        <text class="group-label">材料</text>
        <view class="chip-wrap">
          <view
            v-for="material in DIAG_MATERIALS"
            :key="material.id"
            :class="['chip', { active: materialId === material.id }]"
            @click="materialId = material.id"
          >
            {{ material.label }}
          </view>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="result-head">
        <text class="title small">初筛候选</text>
        <text class="desc small">先给你一批最相关的问题，后面再继续细化到完整诊断题库。</text>
      </view>

      <view v-if="candidates.length" class="list">
        <view
          v-for="item in candidates"
          :key="item.id"
          class="candidate-card"
          @click="openDetail(item.id)"
        >
          <view class="candidate-top">
            <text class="candidate-title">{{ item.title }}</text>
            <text class="candidate-score">{{ item._score }}分</text>
          </view>
          <text class="candidate-sub">{{ item.subtitle }}</text>
        </view>
      </view>

      <view v-else class="empty-box">
        <text>当前条件下还没有筛到候选，可以换个阶段或先直接搜索。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DIAG_MATERIALS, DIAG_PRINTERS, DIAG_STAGES } from '../../../../../packages/shared/diagnosis/problems.js'
import { getMiniappDiagnosisCandidates } from '../../lib/problem-service.js'

const stageId = ref(DIAG_STAGES[0].id)
const printerId = ref('all')
const materialId = ref('any')

const candidates = computed(() =>
  getMiniappDiagnosisCandidates({
    stageId: stageId.value,
    printer: printerId.value,
    material: materialId.value,
  }),
)

function openDetail(id) {
  uni.navigateTo({ url: `/pages/problem-detail/index?id=${id}` })
}
</script>

<style scoped>
.page {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.panel,
.candidate-card,
.empty-box {
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

.title.small {
  font-size: 30rpx;
}

.desc {
  margin-top: 10rpx;
  display: block;
  font-size: 25rpx;
  line-height: 1.7;
  color: #617791;
}

.desc.small {
  margin-top: 6rpx;
}

.group {
  margin-top: 24rpx;
}

.group-label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 24rpx;
  color: #7990a8;
}

.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.chip {
  padding: 14rpx 20rpx;
  border-radius: 999rpx;
  background: #edf2f7;
  color: #5f748e;
  font-size: 24rpx;
}

.chip.active {
  background: rgba(37, 104, 232, 0.12);
  color: #2568e8;
}

.result-head {
  margin-bottom: 18rpx;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.candidate-card {
  padding: 22rpx;
}

.candidate-top {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.candidate-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: #132033;
}

.candidate-score {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #127b91;
  background: rgba(24, 181, 212, 0.12);
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
}

.candidate-sub {
  margin-top: 10rpx;
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: #617791;
}

.empty-box {
  padding: 28rpx;
  font-size: 24rpx;
  color: #6f8298;
  line-height: 1.7;
}
</style>
