<script setup>
import { reactive, ref, watch } from 'vue'
import { useLocale } from '@/composables/useLocale.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  currentUser: { type: Object, default: null },
  profile: {
    type: Object,
    default: () => ({
      status: 'unverified',
      maskedName: '',
      maskedIdNumber: '',
      rejectedReason: '',
    }),
  },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'submit'])
const { t } = useLocale()

const form = reactive({
  realname: '',
  idNumber: '',
  phone: '',
})
const error = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.realname = ''
    form.idNumber = ''
    form.phone = props.currentUser?.phone || ''
    error.value = ''
  },
)

function handleSubmit() {
  error.value = ''
  if (!form.realname.trim()) {
    error.value = t('rn.errName')
    return
  }
  if (!/^\d{17}[\dXx]$/.test(form.idNumber.trim())) {
    error.value = t('rn.errId')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) {
    error.value = t('rn.errPhone')
    return
  }
  emit('submit', {
    realname: form.realname.trim(),
    idNumber: form.idNumber.trim().toUpperCase(),
    phone: form.phone.trim(),
  })
}
</script>

<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-mask">
      <div class="realname-modal">
        <div class="realname-head">
          <div>
            <h2 class="realname-title">{{ t('rn.title') }}</h2>
            <p class="realname-sub">{{ t('rn.sub') }}</p>
          </div>
          <button class="realname-close" @click="emit('close')">✕</button>
        </div>

        <div class="realname-state">
          <span class="state-label">{{ t('rn.currentState') }}</span>
          <span :class="['state-badge', profile.status]">
            {{ profile.status === 'verified' ? t('rn.statusVerified') : profile.status === 'pending' ? t('rn.statusPending') : profile.status === 'rejected' ? t('rn.statusRejected') : t('rn.statusUnverified') }}
          </span>
        </div>

        <div v-if="profile.maskedName || profile.maskedIdNumber" class="realname-summary">
          <p v-if="profile.maskedName">{{ t('rn.nameMasked') }}：{{ profile.maskedName }}</p>
          <p v-if="profile.maskedIdNumber">{{ t('rn.idMasked') }}：{{ profile.maskedIdNumber }}</p>
        </div>

        <div v-if="profile.status === 'pending'" class="realname-notice pending">
          {{ t('rn.pendingNotice') }}
        </div>
        <div v-else-if="profile.status === 'verified'" class="realname-notice verified">
          {{ t('rn.verifiedNotice') }}
        </div>
        <div v-else-if="profile.status === 'rejected'" class="realname-notice rejected">
          <p>{{ t('rn.rejectedNotice') }}</p>
          <p v-if="profile.rejectedReason" class="reject-reason">{{ t('rn.rejectReason') }}：{{ profile.rejectedReason }}</p>
        </div>

        <div v-if="profile.status !== 'verified'" class="realname-form">
          <div class="field">
            <label>{{ t('rn.name') }}</label>
            <input v-model="form.realname" :placeholder="t('rn.namePh')" />
          </div>
          <div class="field">
            <label>{{ t('rn.idNumber') }}</label>
            <input v-model="form.idNumber" :placeholder="t('rn.idPh')" maxlength="18" />
          </div>
          <div class="field">
            <label>{{ t('rn.phone') }}</label>
            <input v-model="form.phone" :placeholder="t('rn.phonePh')" maxlength="11" />
          </div>

          <div class="realname-legal">
            <p>{{ t('rn.legal1') }}</p>
            <p>{{ t('rn.legal2') }}</p>
          </div>

          <div v-if="error" class="auth-error">{{ error }}</div>

          <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
            <span v-if="submitting" class="btn-spinner"></span>
            {{ submitting ? t('rn.submitting') : t('rn.submit') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.realname-modal {
  width: min(560px, calc(100vw - 32px));
  background: rgba(251, 253, 255, 0.98);
  border: 1px solid rgba(34, 56, 89, 0.08);
  border-radius: 24px;
  box-shadow: 0 28px 80px rgba(20, 37, 68, 0.18);
  padding: 24px;
  position: relative;
}

.realname-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.realname-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--lab-text);
}

.realname-sub {
  margin-top: 8px;
  color: var(--lab-text-soft);
  font-size: 14px;
  line-height: 1.7;
}

.realname-close {
  border: none;
  background: rgba(31, 53, 93, 0.08);
  color: var(--lab-text);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  cursor: pointer;
}

.realname-state {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.state-label {
  color: var(--lab-text-soft);
  font-size: 13px;
}

.state-badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.state-badge.unverified {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.state-badge.pending {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.state-badge.verified {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}

.state-badge.rejected {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.realname-summary,
.realname-notice,
.realname-legal {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(244, 248, 252, 0.9);
  border: 1px solid rgba(34, 56, 89, 0.08);
  color: var(--lab-text-soft);
  font-size: 13px;
  line-height: 1.8;
}

.realname-notice.pending {
  background: rgba(245, 158, 11, 0.08);
  color: #92400e;
}

.realname-notice.verified {
  background: rgba(16, 185, 129, 0.08);
  color: #065f46;
}

.realname-notice.rejected {
  background: rgba(239, 68, 68, 0.08);
  color: #991b1b;
}

.reject-reason {
  margin-top: 6px;
}

.realname-form {
  margin-top: 18px;
}

.field + .field {
  margin-top: 14px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  color: var(--lab-text);
  font-weight: 600;
  font-size: 14px;
}

.field input {
  width: 100%;
  background: rgba(244, 248, 252, 0.95);
  border: 1px solid var(--lab-line);
  border-radius: 12px;
  padding: 12px 14px;
  color: var(--lab-text);
  font-size: 15px;
  font-family: inherit;
  outline: none;
}

.field input:focus {
  border-color: rgba(37, 104, 232, 0.34);
  box-shadow: 0 0 0 4px rgba(37, 104, 232, 0.08);
}

@media (max-width: 640px) {
  .realname-modal {
    padding: 20px;
    border-radius: 20px;
  }
}
</style>
