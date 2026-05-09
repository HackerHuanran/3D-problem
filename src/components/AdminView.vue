<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '@/lib/tcb.js'

const props = defineProps({ currentUser: Object })
const emit  = defineEmits(['back'])

const activeTab  = ref('pending')   // pending | approved | rejected
const items      = ref([])
const loading    = ref(false)
const actioningId = ref(null)

const pending  = computed(() => items.value.filter(i => i.status === 'pending'))
const approved = computed(() => items.value.filter(i => i.status === 'approved'))
const rejected = computed(() => items.value.filter(i => i.status === 'rejected'))
const current  = computed(() => ({ pending, approved, rejected }[activeTab.value].value))

async function load() {
  loading.value = true
  try {
    const { data } = await db.collection('service_providers')
      .orderBy('created_at', 'desc')
      .limit(200)
      .get()
    items.value = data.map(d => ({
      _id:         d._id,
      name:        d.name,
      type:        d.type,
      province:    d.province,
      city:        d.city,
      wechat:      d.wechat,
      phone:       d.phone,
      leadTime:    d.lead_time,
      minOrder:    d.min_order,
      priceRange:  d.price_range,
      desc:        d.desc,
      specialties: d.specialties || [],
      materials:   d.materials   || [],
      postProcess: d.post_process || [],
      status:      d.status,
      username:    d.username,
      createdAt:   d.created_at instanceof Date
                    ? d.created_at.getTime()
                    : new Date(d.created_at).getTime(),
    }))
  } finally {
    loading.value = false
  }
}

async function setStatus(id, status) {
  actioningId.value = id
  try {
    await db.collection('service_providers').doc(id).update({ status })
    const item = items.value.find(i => i._id === id)
    if (item) item.status = status
  } finally {
    actioningId.value = null
  }
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)    return '刚刚'
  if (s < 3600)  return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <div class="admin-nav">
      <button class="back-btn" @click="emit('back')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </button>
      <span class="admin-title">管理后台</span>
      <button class="refresh-btn" @click="load" :disabled="loading">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" :class="{ spinning: loading }">
          <path d="M13 7.5A5.5 5.5 0 112 7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M13 4v3.5h-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        刷新
      </button>
    </div>

    <div class="admin-content">
      <!-- 概览卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-num pending-color">{{ pending.length }}</div>
          <div class="stat-label">待审核</div>
        </div>
        <div class="stat-card">
          <div class="stat-num approved-color">{{ approved.length }}</div>
          <div class="stat-label">已通过</div>
        </div>
        <div class="stat-card">
          <div class="stat-num rejected-color">{{ rejected.length }}</div>
          <div class="stat-label">已拒绝</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ items.length }}</div>
          <div class="stat-label">总计</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          v-for="{ key, label, list } in [
            { key: 'pending',  label: '待审核', list: pending  },
            { key: 'approved', label: '已通过', list: approved },
            { key: 'rejected', label: '已拒绝', list: rejected },
          ]"
          :key="key"
          :class="['tab-btn', { active: activeTab === key }]"
          @click="activeTab = key"
        >
          {{ label }}
          <span class="tab-count" :class="key + '-bg'">{{ list.length }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>加载中…</span>
      </div>

      <!-- Empty -->
      <div v-else-if="current.length === 0" class="empty-state">
        <div class="empty-icon">{{ activeTab === 'pending' ? '✅' : '📭' }}</div>
        <div>{{ activeTab === 'pending' ? '没有待审核的申请' : '暂无记录' }}</div>
      </div>

      <!-- 列表 -->
      <div v-else class="app-list">
        <div v-for="item in current" :key="item._id" class="app-card">
          <div class="app-card-head">
            <div class="app-info">
              <div class="app-name">{{ item.name }}</div>
              <div class="app-meta">
                <span class="app-type">{{ item.type }}</span>
                <span class="dot">·</span>
                <span>{{ item.province }} {{ item.city }}</span>
                <span class="dot">·</span>
                <span>{{ item.username }} 提交</span>
                <span class="dot">·</span>
                <span class="time">{{ timeAgo(item.createdAt) }}</span>
              </div>
            </div>
            <!-- Actions -->
            <div class="app-actions" v-if="activeTab === 'pending'">
              <button
                class="action-btn approve"
                :disabled="actioningId === item._id"
                @click="setStatus(item._id, 'approved')"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l4 4 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                通过
              </button>
              <button
                class="action-btn reject"
                :disabled="actioningId === item._id"
                @click="setStatus(item._id, 'rejected')"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                拒绝
              </button>
            </div>
            <div v-else-if="activeTab === 'approved'" class="app-actions">
              <button class="action-btn reject" :disabled="actioningId === item._id" @click="setStatus(item._id, 'rejected')">撤回上线</button>
            </div>
            <div v-else class="app-actions">
              <button class="action-btn approve" :disabled="actioningId === item._id" @click="setStatus(item._id, 'approved')">重新通过</button>
            </div>
          </div>

          <!-- 详情 -->
          <div class="app-detail">
            <div class="detail-row">
              <span class="dl">擅长工艺</span>
              <span class="dv">{{ item.specialties.join('、') || '未填写' }}</span>
            </div>
            <div class="detail-row">
              <span class="dl">支持材料</span>
              <span class="dv">{{ item.materials.join('、') || '未填写' }}</span>
            </div>
            <div class="detail-row">
              <span class="dl">后处理</span>
              <span class="dv">{{ item.postProcess.join('、') || '未填写' }}</span>
            </div>
            <div class="detail-row">
              <span class="dl">起订/周期</span>
              <span class="dv">{{ item.minOrder }}件 · {{ item.leadTime || '未填写' }} · 价格{{ item.priceRange === '低' ? '实惠' : item.priceRange === '高' ? '专业' : '适中' }}</span>
            </div>
            <div class="detail-row">
              <span class="dl">联系方式</span>
              <span class="dv contact-val">微信：{{ item.wechat }}　电话：{{ item.phone }}</span>
            </div>
            <div v-if="item.desc" class="detail-row">
              <span class="dl">简介</span>
              <span class="dv">{{ item.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page { min-height: 100vh; background: #f5f5f7; }

.admin-nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  display: flex; align-items: center; gap: 12px;
  padding: 0 24px; height: 48px;
}
.back-btn {
  display: flex; align-items: center; gap: 4px;
  background: transparent; border: none; color: #6e6e73; font-size: 14px;
  font-family: inherit; cursor: pointer; padding: 4px 0; transition: color 0.15s;
}
.back-btn:hover { color: #1d1d1f; }
.admin-title { font-size: 15px; font-weight: 700; color: #1d1d1f; flex: 1; }
.refresh-btn {
  display: flex; align-items: center; gap: 5px;
  background: transparent; border: none; color: #6e6e73; font-size: 13px;
  font-family: inherit; cursor: pointer; transition: color 0.15s;
}
.refresh-btn:hover:not(:disabled) { color: #1d1d1f; }
.refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.admin-content { max-width: 900px; margin: 0 auto; padding: 24px 24px 60px; }

/* Stat cards */
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 14px; padding: 16px 20px; border: 1px solid rgba(0,0,0,0.07); }
.stat-num { font-size: 30px; font-weight: 800; color: #1d1d1f; letter-spacing: -0.03em; line-height: 1; margin-bottom: 4px; }
.stat-label { font-size: 12px; color: #aeaeb2; }
.pending-color  { color: #f0a500; }
.approved-color { color: #5cba7a; }
.rejected-color { color: #ff6b6b; }

/* Tabs */
.tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tab-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 16px; border-radius: 100px;
  background: #fff; border: 1px solid rgba(0,0,0,0.1);
  color: #6e6e73; font-size: 14px; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.tab-btn:hover { color: #1d1d1f; border-color: rgba(0,0,0,0.2); }
.tab-btn.active { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }
.tab-count { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 100px; }
.pending-bg  { background: rgba(240,165,0,.15);  color: #f0a500; }
.approved-bg { background: rgba(92,186,122,.15); color: #5cba7a; }
.rejected-bg { background: rgba(255,107,107,.15); color: #ff6b6b; }
.tab-btn.active .tab-count { background: rgba(255,255,255,.2); color: #fff; }

/* Loading / Empty */
.loading-state { display: flex; align-items: center; gap: 10px; color: #6e6e73; font-size: 14px; padding: 40px 0; justify-content: center; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(0,0,0,.1); border-top-color: #1d1d1f; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.spinning { animation: spin 0.7s linear infinite; }
.empty-state { text-align: center; padding: 60px 20px; color: #6e6e73; font-size: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.empty-icon { font-size: 36px; }

/* App list */
.app-list { display: flex; flex-direction: column; gap: 10px; }
.app-card { background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.07); overflow: hidden; }
.app-card-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 18px; gap: 12px; }
.app-info { flex: 1; min-width: 0; }
.app-name { font-size: 16px; font-weight: 700; color: #1d1d1f; margin-bottom: 5px; }
.app-meta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; font-size: 12px; color: #6e6e73; }
.app-type { background: #f5f5f7; padding: 2px 7px; border-radius: 6px; font-weight: 500; }
.dot { color: #c7c7cc; }
.time { color: #aeaeb2; }
.app-actions { display: flex; gap: 8px; flex-shrink: 0; }
.action-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 10px; border: none;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.action-btn.approve { background: rgba(92,186,122,.12); color: #3a9e5f; }
.action-btn.approve:hover:not(:disabled) { background: rgba(92,186,122,.22); }
.action-btn.reject  { background: rgba(255,107,107,.1);  color: #e03030; }
.action-btn.reject:hover:not(:disabled)  { background: rgba(255,107,107,.2); }

/* Detail */
.app-detail { padding: 0 18px 16px; border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 7px; padding-top: 12px; }
.detail-row { display: flex; gap: 12px; font-size: 13px; }
.dl { color: #aeaeb2; font-weight: 500; flex-shrink: 0; width: 56px; }
.dv { color: #3a3a3c; line-height: 1.5; }
.contact-val { font-family: 'SF Mono', monospace; font-size: 12px; }

@media (max-width: 600px) {
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .app-card-head { flex-direction: column; }
  .app-actions { width: 100%; }
  .action-btn { flex: 1; justify-content: center; }
}
</style>
