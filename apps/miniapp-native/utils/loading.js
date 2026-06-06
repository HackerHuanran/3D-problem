let loadingCount = 0
let showTimer = null
let hideTimer = null
let visible = false
let visibleAt = 0
let pendingTitle = '加载中'

const DEFAULT_DELAY = 150
const MIN_VISIBLE_DURATION = 180

function resolveLoadingBehavior(title = '', options = {}) {
  const normalizedTitle = String(title || '').trim()
  if (typeof options.delay === 'number' || typeof options.minVisibleDuration === 'number') {
    return {
      delay: Math.max(0, Number(options.delay ?? DEFAULT_DELAY) || 0),
      minVisibleDuration: Math.max(0, Number(options.minVisibleDuration ?? MIN_VISIBLE_DURATION) || 0),
    }
  }

  if (normalizedTitle === '正在打开') {
    return {
      delay: 90,
      minVisibleDuration: 160,
    }
  }

  if (['保存中', '提交中', '上传中', '删除中', '处理中'].includes(normalizedTitle)) {
    return {
      delay: 0,
      minVisibleDuration: 220,
    }
  }

  return {
    delay: DEFAULT_DELAY,
    minVisibleDuration: MIN_VISIBLE_DURATION,
  }
}

function clearShowTimer() {
  if (!showTimer) return
  clearTimeout(showTimer)
  showTimer = null
}

function clearHideTimer() {
  if (!hideTimer) return
  clearTimeout(hideTimer)
  hideTimer = null
}

function reallyShowLoading(title = '加载中') {
  visible = true
  visibleAt = Date.now()
  wx.showLoading({
    title,
    mask: true,
  })
}

function showAppLoading(title = '加载中', options = {}) {
  const nextTitle = String(title || '').trim() || '加载中'
  const behavior = resolveLoadingBehavior(nextTitle, options)
  const delay = behavior.delay
  pendingTitle = nextTitle
  loadingCount += 1
  clearHideTimer()

  if (visible) {
    reallyShowLoading(nextTitle)
    return
  }

  if (showTimer) {
    return
  }

  showTimer = setTimeout(() => {
    showTimer = null
    if (loadingCount <= 0 || visible) return
    reallyShowLoading(pendingTitle)
  }, delay)
}

function hideAppLoading(force = false) {
  if (force) {
    loadingCount = 0
    pendingTitle = '加载中'
    visible = false
    visibleAt = 0
    clearShowTimer()
    clearHideTimer()
    wx.hideLoading()
    return
  }

  loadingCount = Math.max(loadingCount - 1, 0)
  if (loadingCount > 0) return

  clearShowTimer()

  if (!visible) return

  const behavior = resolveLoadingBehavior(pendingTitle)
  const elapsed = Date.now() - visibleAt
  const wait = Math.max(0, behavior.minVisibleDuration - elapsed)
  clearHideTimer()
  hideTimer = setTimeout(() => {
    hideTimer = null
    if (loadingCount > 0) return
    visible = false
    visibleAt = 0
    pendingTitle = '加载中'
    wx.hideLoading()
  }, wait)
}

async function withAppLoading(task, title = '加载中', options = {}) {
  showAppLoading(title, options)
  try {
    return await task()
  } finally {
    hideAppLoading()
  }
}

module.exports = {
  showAppLoading,
  hideAppLoading,
  withAppLoading,
}
