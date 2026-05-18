import { ref } from 'vue'

const toasts = ref([])
let seed = 0

function removeToast(id) {
  toasts.value = toasts.value.filter((item) => item.id !== id)
}

function pushToast(message, type = 'info', duration = 2600) {
  const id = `toast-${Date.now()}-${seed += 1}`
  toasts.value = [...toasts.value, { id, message: String(message || ''), type }]
  if (duration > 0) {
    window.setTimeout(() => removeToast(id), duration)
  }
  return id
}

export function useToast() {
  return {
    toasts,
    removeToast,
    success(message, duration) {
      return pushToast(message, 'success', duration)
    },
    error(message, duration) {
      return pushToast(message, 'error', duration)
    },
    info(message, duration) {
      return pushToast(message, 'info', duration)
    },
  }
}
