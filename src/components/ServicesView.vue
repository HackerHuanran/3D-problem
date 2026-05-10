<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { db } from '@/lib/tcb.js'
import { services as staticServices, serviceTypes, provinces, specialtyTags, PRICE_LABEL, PRICE_COLOR, TYPE_COLOR } from '../data/services.js'

const props = defineProps({ currentUser: Object, autoOpenJoin: Boolean })
const emit  = defineEmits(['open-auth', 'join-opened'])

// ── 从数据库加载已审核通过的服务商 ─────────────────────────────────────────────
const dbServices = ref([])
onMounted(async () => {
  try {
    const { data } = await db.collection('service_providers')
      .where({ status: 'approved' })
      .orderBy('created_at', 'desc')
      .limit(200)
      .get()
    dbServices.value = data.map(d => ({
      id:          d._id,
      name:        d.name,
      type:        d.type,
      city:        d.city,
      province:    d.province,
      lat: 0, lng: 0,
      specialties: d.specialties || [],
      materials:   d.materials   || [],
      postProcess: d.post_process || [],
      minOrder:    d.min_order   || 1,
      leadTime:    d.lead_time   || '',
      priceRange:  d.price_range || '中',
      rating:      0,
      reviewCount: 0,
      wechat:      d.wechat,
      phone:       d.phone,
      desc:        d.desc || '',
      verified:    false,
      tags:        [],
      fromDb:      true,
    }))
  } catch (e) {
    if (!e?.code?.includes('COLLECTION_NOT_EXIST') && !e?.message?.includes('not exist')) {
      console.warn('[ServicesView] 加载服务商失败:', e?.message)
    }
  }
})

// 合并静态 + 数据库数据
const services = computed(() => [...staticServices, ...dbServices.value])

// ── 筛选 ──────────────────────────────────────────────────────────────────────
const selectedType      = ref('全部')
const selectedProvince  = ref('全部')
const selectedSpecialty = ref('全部')
const searchQuery       = ref('')
const expandedId        = ref(null)

const filtered = computed(() => {
  return services.value.filter(s => {
    if (selectedType.value !== '全部' && s.type !== selectedType.value) return false
    if (selectedProvince.value !== '全部' && s.province !== selectedProvince.value) return false
    if (selectedSpecialty.value !== '全部') {
      const q = selectedSpecialty.value
      if (!s.specialties.some(x => x.includes(q)) && !s.materials.some(x => x.includes(q))) return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.specialties.some(x => x.toLowerCase().includes(q)) ||
        s.materials.some(x => x.toLowerCase().includes(q)) ||
        (s.tags || []).some(x => x.includes(q))
      )
    }
    return true
  })
})

function toggleExpand(id) { expandedId.value = expandedId.value === id ? null : id }
function priceStyle(p) { return PRICE_COLOR[p] || {} }
function typeStyle(t)  { return TYPE_COLOR[t]  || {} }

const stats = computed(() => ({
  total:     services.value.length,
  factories: services.value.filter(s => s.type === '专业工厂').length,
  studios:   services.value.filter(s => s.type === '工作室').length,
  platforms: services.value.filter(s => s.type === '平台服务').length,
}))

// ── 入驻弹窗 ──────────────────────────────────────────────────────────────────
const showJoin    = ref(false)
const joinSuccess = ref(false)
const joinLoading = ref(false)
const joinError   = ref('')

watch(() => props.autoOpenJoin, (v) => {
  if (v) { openJoin(); emit('join-opened') }
})

function openJoin() {
  if (!props.currentUser) { emit('open-auth', 'login'); return }
  joinSuccess.value = false
  joinError.value   = ''
  resetForm()
  showJoin.value    = true
}
function closeJoin() { showJoin.value = false }

const MATERIAL_OPTIONS = ['PLA', 'PLA+', 'PETG', 'ABS', 'ABS+', 'ASA', 'TPU', 'PA', 'PA-CF', 'PC', 'PLA-CF', 'PETG-CF', 'HIPS', '光固化树脂', '钛合金', '不锈钢', '铝合金']
const SPECIALTY_OPTIONS = ['FDM', 'SLA精密', 'SLS', 'SLM金属打印', 'PEEK', '手办定制', '建筑模型', '工业零件', '医疗模型', '汽车配件', '影视道具', '教育模型', '珠宝蜡型', '碳纤维件', '批量生产']
const POSTPROCESS_OPTIONS = ['打磨', '喷漆', '上色', '电镀', '组装', '机加工', '丝印', '灭菌处理', '真空电镀', '喷砂', '热处理']
const PROVINCE_LIST = ['广东', '上海', '浙江', '江苏', '北京', '天津', '湖北', '湖南', '四川', '重庆', '陕西', '辽宁', '山东', '河南', '福建', '安徽', '湖南', '河北', '其他']

function resetForm() {
  form.value = { name: '', type: '专业工厂', province: '', city: '', wechat: '', phone: '', leadTime: '', minOrder: 1, priceRange: '中', desc: '' }
  selectedMaterials.value  = []
  selectedSpecialties.value = []
  selectedPostProcess.value = []
}

const form                = ref({ name: '', type: '专业工厂', province: '', city: '', wechat: '', phone: '', leadTime: '', minOrder: 1, priceRange: '中', desc: '' })
const selectedMaterials   = ref([])
const selectedSpecialties = ref([])
const selectedPostProcess = ref([])


async function submitJoin() {
  joinError.value = ''
  if (!form.value.name.trim())   { joinError.value = '请填写服务商名称'; return }
  if (!form.value.province)      { joinError.value = '请选择所在省份'; return }
  if (!form.value.city.trim())   { joinError.value = '请填写城市'; return }
  if (!form.value.wechat.trim()) { joinError.value = '请填写微信联系方式'; return }
  if (!form.value.phone.trim())  { joinError.value = '请填写联系电话'; return }
  if (selectedSpecialties.value.length === 0) { joinError.value = '请至少选择一项擅长工艺'; return }
  if (selectedMaterials.value.length === 0)   { joinError.value = '请至少选择一种支持材料'; return }

  joinLoading.value = true
  try {
    await db.collection('service_providers').add({
      user_id:     props.currentUser.id,
      username:    props.currentUser.username,
      name:        form.value.name.trim(),
      type:        form.value.type,
      province:    form.value.province,
      city:        form.value.city.trim(),
      wechat:      form.value.wechat.trim(),
      phone:       form.value.phone.trim(),
      lead_time:   form.value.leadTime.trim(),
      min_order:   Number(form.value.minOrder) || 1,
      price_range: form.value.priceRange,
      desc:        form.value.desc.trim(),
      specialties: selectedSpecialties.value,
      materials:   selectedMaterials.value,
      post_process: selectedPostProcess.value,
      status:      'pending',
      created_at:  new Date(),
    })
    joinSuccess.value = true
  } catch (e) {
    joinError.value = e.message || '提交失败，请稍后重试'
  } finally {
    joinLoading.value = false
  }
}
</script>

<template>
  <div class="services-page">
    <!-- Hero -->
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-badge">服务商目录</div>
        <h1 class="hero-title">找到靠谱的3D打印服务</h1>
        <p class="hero-sub">收录 {{ stats.total }} 家服务商 · {{ stats.factories }} 家专业工厂 · {{ stats.studios }} 个工作室 · {{ stats.platforms }} 个在线平台</p>
        <div class="hero-actions">
          <div class="hero-search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <input v-model="searchQuery" class="search-input" placeholder="搜索服务商名称、城市、工艺…" />
          </div>
          <button class="hero-join-btn" @click="openJoin">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            免费入驻
          </button>
        </div>
      </div>
    </div>

    <div class="content">
      <!-- 筛选栏 -->
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">类型</span>
          <div class="chips">
            <button v-for="t in serviceTypes" :key="t"
              :class="['chip', { active: selectedType === t }]"
              :style="selectedType === t && t !== '全部' ? { background: typeStyle(t).bg, color: typeStyle(t).color, borderColor: typeStyle(t).color + '55' } : {}"
              @click="selectedType = t">{{ t }}</button>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">地区</span>
          <div class="chips">
            <button v-for="p in provinces" :key="p"
              :class="['chip', { active: selectedProvince === p }]"
              @click="selectedProvince = p">{{ p }}</button>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">擅长</span>
          <div class="chips">
            <button v-for="sp in specialtyTags" :key="sp"
              :class="['chip', { active: selectedSpecialty === sp }]"
              @click="selectedSpecialty = sp">{{ sp }}</button>
          </div>
        </div>
      </div>

      <!-- 结果栏 -->
      <div class="results-meta">
        <span class="results-count">{{ filtered.length }} 家服务商</span>
        <button
          v-if="selectedType !== '全部' || selectedProvince !== '全部' || selectedSpecialty !== '全部' || searchQuery"
          class="reset-btn"
          @click="selectedType='全部'; selectedProvince='全部'; selectedSpecialty='全部'; searchQuery=''">
          清除筛选
        </button>
      </div>

      <!-- 卡片列表 -->
      <div v-if="filtered.length" class="cards">
        <div v-for="s in filtered" :key="s.id" class="card" :class="{ expanded: expandedId === s.id }">
          <div class="card-head" @click="toggleExpand(s.id)">
            <div class="card-main">
              <div class="card-title-row">
                <span class="card-name">{{ s.name }}</span>
                <span v-if="s.verified" class="verified-badge">
                  <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1L8 4.5l3.8.3-2.8 2.4 1 3.7L6.5 9l-3.5 1.9 1-3.7L1.2 4.8 5 4.5z" fill="#5cba7a"/>
                  </svg>
                  已认证
                </span>
              </div>
              <div class="card-meta-row">
                <span class="meta-item">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 3.08 3.5 6.5 3.5 6.5s3.5-3.42 3.5-6.5C9.5 2.57 7.93 1 6 1zm0 4.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" fill="currentColor"/></svg>
                  {{ s.city }}
                </span>
                <span class="meta-dot">·</span>
                <span class="meta-item">{{ s.leadTime }}</span>
                <span class="meta-dot">·</span>
                <span class="meta-item">起步 {{ s.minOrder === 1 ? '1件' : s.minOrder + '件' }}</span>
              </div>
              <div class="card-tags">
                <span class="type-badge" :style="{ background: typeStyle(s.type).bg, color: typeStyle(s.type).color }">{{ s.type }}</span>
                <span v-for="tag in s.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="card-right">
<span class="price-badge" :style="{ background: priceStyle(s.priceRange).bg, color: priceStyle(s.priceRange).color }">{{ PRICE_LABEL[s.priceRange] }}</span>
              <svg class="expand-arrow" :class="{ open: expandedId === s.id }" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <Transition name="expand">
            <div v-if="expandedId === s.id" class="card-detail">
              <p class="detail-desc">{{ s.desc }}</p>
              <div class="detail-grid">
                <div class="detail-section">
                  <div class="detail-label">擅长工艺</div>
                  <div class="detail-chips">
                    <span v-for="sp in s.specialties" :key="sp" class="detail-chip specialty">{{ sp }}</span>
                  </div>
                </div>
                <div class="detail-section">
                  <div class="detail-label">支持材料</div>
                  <div class="detail-chips">
                    <span v-for="m in s.materials" :key="m" class="detail-chip material">{{ m }}</span>
                  </div>
                </div>
                <div class="detail-section">
                  <div class="detail-label">后处理</div>
                  <div class="detail-chips">
                    <span v-for="pp in s.postProcess" :key="pp" class="detail-chip">{{ pp }}</span>
                  </div>
                </div>
              </div>
              <div class="contact-bar">
                <div class="contact-item">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="10" rx="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 7.5c0 1.7 1.2 3 2.5 3a2.5 2.5 0 001.9-.9V11H11V7.5H9.5v1a1.2 1.2 0 01-1 .7c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7a1.2 1.2 0 011 .5l1-1A2.5 2.5 0 007.5 5c-1.3 0-2.5 1.3-2.5 2.5z" fill="currentColor"/></svg>
                  <span class="contact-val">{{ s.wechat }}</span>
                </div>
                <div class="contact-item">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3.5 2.5h2.5l1 3-1.5.8a7.5 7.5 0 003.2 3.2l.8-1.5 3 1v2.5A1.5 1.5 0 0111 13C5.5 13 3 7.5 3 4A1.5 1.5 0 013.5 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
                  <span class="contact-val">{{ s.phone }}</span>
                </div>
                <button class="contact-btn" @click.stop>立即联系</button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">🏭</div>
        <div class="empty-title">没有找到匹配的服务商</div>
        <div class="empty-sub">换个筛选条件试试，或清除搜索关键词</div>
      </div>

      <!-- 入驻横幅 -->
      <div class="join-banner">
        <div class="join-left">
          <div class="join-title">你的工厂/工作室还没上榜？</div>
          <div class="join-sub">免费入驻，触达数万3D打印需求用户</div>
        </div>
        <button class="join-btn" @click="openJoin">免费入驻</button>
      </div>
    </div>
  </div>

  <!-- ── 入驻弹窗 ─────────────────────────────────────────────────────────── -->
  <Transition name="modal">
    <div v-if="showJoin" class="modal-mask" @click="closeJoin">
      <div class="join-modal" @click.stop>
        <div class="join-modal-header">
          <h2 class="join-modal-title">服务商免费入驻</h2>
          <p class="join-modal-sub">提交后我们将在1–3个工作日内完成审核并上线</p>
        </div>
        <button class="modal-close-btn" @click="closeJoin">✕</button>

        <!-- 成功状态 -->
        <div v-if="joinSuccess" class="join-success">
          <div class="success-icon">✅</div>
          <div class="success-title">提交成功！</div>
          <div class="success-sub">我们已收到您的入驻申请，将在1–3个工作日内审核，审核通过后自动上线展示。</div>
          <button class="submit-btn" @click="closeJoin">好的，知道了</button>
        </div>

        <!-- 表单 -->
        <div v-else class="join-form">
          <!-- 基本信息 -->
          <div class="form-section-title">基本信息</div>
          <div class="form-row">
            <div class="field">
              <label>服务商名称 <span class="req">*</span></label>
              <input v-model="form.name" placeholder="请输入工厂/工作室全称" />
            </div>
          </div>
          <div class="form-row two-col">
            <div class="field">
              <label>类型 <span class="req">*</span></label>
              <select v-model="form.type">
                <option>专业工厂</option>
                <option>工作室</option>
                <option>平台服务</option>
              </select>
            </div>
            <div class="field">
              <label>价格定位 <span class="req">*</span></label>
              <select v-model="form.priceRange">
                <option value="低">实惠（低价策略）</option>
                <option value="中">适中（市场均价）</option>
                <option value="高">专业（高端定制）</option>
              </select>
            </div>
          </div>
          <div class="form-row two-col">
            <div class="field">
              <label>所在省份 <span class="req">*</span></label>
              <select v-model="form.province">
                <option value="">请选择省份</option>
                <option v-for="p in PROVINCE_LIST" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="field">
              <label>城市 <span class="req">*</span></label>
              <input v-model="form.city" placeholder="如：深圳" />
            </div>
          </div>
          <div class="form-row two-col">
            <div class="field">
              <label>最小起订量</label>
              <input v-model.number="form.minOrder" type="number" min="1" placeholder="1" />
            </div>
            <div class="field">
              <label>交货周期</label>
              <input v-model="form.leadTime" placeholder="如：1–3天、24小时急单" />
            </div>
          </div>

          <!-- 擅长工艺 -->
          <div class="form-section-title">服务能力</div>
          <div class="field">
            <label>擅长工艺 <span class="req">*</span>（可多选）</label>
            <div class="check-grid">
              <label v-for="sp in SPECIALTY_OPTIONS" :key="sp" class="check-item" :class="{ checked: selectedSpecialties.includes(sp) }">
                <input type="checkbox" :value="sp" v-model="selectedSpecialties" hidden />
                {{ sp }}
              </label>
            </div>
          </div>
          <div class="field">
            <label>支持材料 <span class="req">*</span>（可多选）</label>
            <div class="check-grid">
              <label v-for="m in MATERIAL_OPTIONS" :key="m" class="check-item" :class="{ checked: selectedMaterials.includes(m) }">
                <input type="checkbox" :value="m" v-model="selectedMaterials" hidden />
                {{ m }}
              </label>
            </div>
          </div>
          <div class="field">
            <label>后处理工艺（可多选）</label>
            <div class="check-grid">
              <label v-for="pp in POSTPROCESS_OPTIONS" :key="pp" class="check-item" :class="{ checked: selectedPostProcess.includes(pp) }">
                <input type="checkbox" :value="pp" v-model="selectedPostProcess" hidden />
                {{ pp }}
              </label>
            </div>
          </div>
          <div class="field">
            <label>服务商简介</label>
            <textarea v-model="form.desc" rows="3" placeholder="介绍你的设备、优势、服务范围…（选填，建议100字以内）"></textarea>
          </div>

          <!-- 联系方式 -->
          <div class="form-section-title">联系方式</div>
          <div class="form-row two-col">
            <div class="field">
              <label>微信号 <span class="req">*</span></label>
              <input v-model="form.wechat" placeholder="微信号或公众号" />
            </div>
            <div class="field">
              <label>联系电话 <span class="req">*</span></label>
              <input v-model="form.phone" type="tel" placeholder="手机号或座机" />
            </div>
          </div>

          <div v-if="joinError" class="join-error">{{ joinError }}</div>
          <button class="submit-btn" :class="{ loading: joinLoading }" :disabled="joinLoading" @click="submitJoin">
            <span v-if="joinLoading" class="btn-spinner"></span>
            {{ joinLoading ? '提交中…' : '提交入驻申请' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.services-page { min-height: 100vh; background: #f5f5f7; }

/* Hero */
.hero { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); padding: 56px 24px 48px; }
.hero-inner { max-width: 1280px; margin: 0 auto; }
.hero-badge { display: inline-block; background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 100px; letter-spacing: 0.08em; margin-bottom: 16px; }
.hero-title { font-size: clamp(24px, 4vw, 38px); font-weight: 800; color: #fff; letter-spacing: -0.03em; margin-bottom: 10px; }
.hero-sub { font-size: 15px; color: rgba(255,255,255,0.55); margin-bottom: 28px; }
.hero-actions { display: flex; align-items: center; gap: 12px; max-width: 700px; }
.hero-search-wrap { position: relative; flex: 1; }
.hero-join-btn { display: flex; align-items: center; gap: 6px; background: #fff; color: #0f3460; border: none; border-radius: 12px; padding: 12px 18px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
.hero-join-btn:hover { background: rgba(255,255,255,0.88); }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); pointer-events: none; }
.search-input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px 16px 12px 40px; color: #fff; font-size: 15px; font-family: inherit; outline: none; transition: all 0.2s; }
.search-input::placeholder { color: rgba(255,255,255,0.35); }
.search-input:focus { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }

/* Content */
.content { max-width: 1280px; margin: 0 auto; padding: 32px 24px 60px; }

/* Filters */
.filters { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.filter-group { display: flex; align-items: flex-start; gap: 12px; }
.filter-label { font-size: 12px; color: #aeaeb2; letter-spacing: 0.05em; font-weight: 600; margin-top: 7px; flex-shrink: 0; width: 28px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 5px 12px; border-radius: 100px; border: 1px solid rgba(0,0,0,0.12); background: #fff; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.chip:hover { border-color: rgba(0,0,0,0.25); color: #1d1d1f; }
.chip.active { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }

/* Results */
.results-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.results-count { font-size: 13px; color: #aeaeb2; }
.reset-btn { background: transparent; border: none; color: #ff6b6b; font-size: 13px; font-family: inherit; cursor: pointer; }
.reset-btn:hover { text-decoration: underline; }

/* Cards */
.cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px; align-items: start; }
.card { background: #fff; border-radius: 18px; overflow: hidden; border: 1px solid rgba(0,0,0,0.07); transition: box-shadow 0.2s; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.card.expanded { box-shadow: 0 4px 24px rgba(0,0,0,0.1); }

.card-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px; cursor: pointer; gap: 12px; }
.card-main { flex: 1; min-width: 0; }
.card-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.card-name { font-size: 16px; font-weight: 700; color: #1d1d1f; }
.verified-badge { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #5cba7a; background: rgba(92,186,122,.1); padding: 2px 7px; border-radius: 100px; font-weight: 600; flex-shrink: 0; }
.card-meta-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6e6e73; margin-bottom: 10px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 3px; }
.meta-dot { color: #c7c7cc; }
.card-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.type-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 100px; }
.tag { font-size: 12px; color: #6e6e73; background: #f5f5f7; border-radius: 6px; padding: 3px 8px; }

.card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.rating-block { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.rating-num { font-size: 18px; font-weight: 700; color: #1d1d1f; line-height: 1; }
.rating-stars { display: flex; gap: 1px; }
.star { font-size: 11px; color: #c7c7cc; }
.star.filled { color: #fdcb6e; }
.review-count { font-size: 11px; color: #aeaeb2; }
.price-badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 100px; }
.expand-arrow { color: #aeaeb2; transition: transform 0.2s; margin-top: 4px; }
.expand-arrow.open { transform: rotate(180deg); }

/* Detail */
.card-detail { padding: 0 20px 20px; border-top: 1px solid rgba(0,0,0,0.06); }
.detail-desc { font-size: 14px; color: #3a3a3c; line-height: 1.7; padding-top: 16px; margin-bottom: 16px; }
.detail-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
.detail-section { display: flex; align-items: flex-start; gap: 12px; }
.detail-label { font-size: 12px; color: #aeaeb2; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; width: 56px; flex-shrink: 0; margin-top: 4px; }
.detail-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.detail-chip { font-size: 12px; padding: 3px 9px; border-radius: 6px; background: #f5f5f7; color: #3a3a3c; }
.detail-chip.specialty { background: rgba(15,52,96,.07); color: #0f3460; }
.detail-chip.material { background: rgba(92,186,122,.1); color: #2e7d52; }

.contact-bar { display: flex; align-items: center; gap: 16px; background: #f5f5f7; border-radius: 12px; padding: 12px 16px; flex-wrap: wrap; }
.contact-item { display: flex; align-items: center; gap: 6px; color: #3a3a3c; font-size: 14px; }
.contact-val { font-weight: 500; font-family: 'SF Mono', monospace; letter-spacing: 0.02em; }
.contact-btn { margin-left: auto; background: #0f3460; color: #fff; border: none; border-radius: 10px; padding: 8px 18px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
.contact-btn:hover { background: #16427a; }

/* Expand transition */
.expand-enter-active, .expand-leave-active { transition: all 0.22s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; padding-bottom: 0; }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 600px; }

/* Empty */
.empty-state { text-align: center; padding: 64px 20px; }
.empty-icon { font-size: 40px; margin-bottom: 16px; }
.empty-title { font-size: 17px; font-weight: 600; color: #1d1d1f; margin-bottom: 8px; }
.empty-sub { font-size: 14px; color: #aeaeb2; }

/* Join Banner */
.join-banner { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #0f3460, #1a4a7a); border-radius: 18px; padding: 24px 28px; gap: 16px; flex-wrap: wrap; }
.join-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.join-sub { font-size: 13px; color: rgba(255,255,255,0.6); }
.join-btn { background: #fff; color: #0f3460; border: none; border-radius: 12px; padding: 10px 22px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
.join-btn:hover { background: rgba(255,255,255,0.9); }

/* Modal */
.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,0.45); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; padding: 20px; overflow-y: auto; }
.join-modal { background: #fff; border-radius: 24px; width: 100%; max-width: 680px; position: relative; margin: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.join-modal-header { padding: 28px 28px 20px; border-bottom: 1px solid rgba(0,0,0,0.07); }
.join-modal-title { font-size: 22px; font-weight: 800; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 4px; }
.join-modal-sub { font-size: 13px; color: #6e6e73; }
.modal-close-btn { position: absolute; top: 14px; right: 16px; background: rgba(0,0,0,0.06); border: none; color: #6e6e73; font-size: 13px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.modal-close-btn:hover { background: rgba(0,0,0,0.1); color: #1d1d1f; }

/* Form */
.join-form { padding: 24px 28px 28px; display: flex; flex-direction: column; gap: 14px; }
.form-section-title { font-size: 13px; font-weight: 700; color: #aeaeb2; letter-spacing: 0.06em; padding-top: 4px; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 12px; margin-top: 4px; }
.form-section-title:first-child { border-top: none; padding-top: 0; margin-top: 0; }
.form-row { display: flex; flex-direction: column; gap: 14px; }
.form-row.two-col { flex-direction: row; gap: 12px; }
.form-row.two-col .field { flex: 1; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: #6e6e73; font-weight: 500; }
.req { color: #ff6b6b; }
.field input, .field select, .field textarea {
  background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px;
  padding: 10px 12px; color: #1d1d1f; font-size: 14px; font-family: inherit;
  outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: rgba(0,0,0,0.25); background: #fff; }
.field textarea { resize: vertical; min-height: 72px; }
.field input::placeholder, .field textarea::placeholder { color: #c7c7cc; }

/* Checkboxes */
.check-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.check-item { padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.12); background: #f5f5f7; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; user-select: none; }
.check-item:hover { border-color: rgba(0,0,0,0.25); color: #1d1d1f; }
.check-item.checked { background: rgba(15,52,96,.1); color: #0f3460; border-color: rgba(15,52,96,.3); font-weight: 600; }

/* Submit */
.join-error { background: rgba(255,59,48,0.08); border: 1px solid rgba(255,59,48,0.2); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff3b30; }
.submit-btn { width: 100%; padding: 13px; background: #0f3460; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; }
.submit-btn:hover:not(:disabled) { background: #16427a; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #aeaeb2; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Success */
.join-success { padding: 40px 28px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.success-icon { font-size: 48px; }
.success-title { font-size: 22px; font-weight: 700; color: #1d1d1f; }
.success-sub { font-size: 14px; color: #6e6e73; line-height: 1.6; max-width: 320px; }

/* Modal transition */
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .cards { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .content { padding-top: 20px; }
  .chips { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .chips::-webkit-scrollbar { display: none; }
}
@media (max-width: 600px) {
  .hero { padding: 36px 16px 32px; }
  .filter-label { display: none; }
  .form-row.two-col { flex-direction: column; }
  .join-modal { border-radius: 16px; }
  .join-modal-header, .join-form { padding-left: 20px; padding-right: 20px; }
  .card-head { flex-wrap: wrap; }
  .card-right { flex-direction: row; align-items: center; width: 100%; justify-content: flex-end; }
  .field input, .field select, .field textarea { font-size: 16px; }
}
</style>
