import { db } from '@/lib/tcb.js'

function safeText(value) {
  return String(value || '').trim()
}

function getTimeValue(value) {
  if (!value) return 0
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function feedbackStatusLabel(status) {
  return status === 'resolved' ? '已处理' : '未处理'
}

function normalizeFeedback(doc = {}) {
  const status = safeText(doc.status) || 'pending'
  return {
    id: doc._id,
    userId: doc.user_id || '',
    username: safeText(doc.username || doc.user_name) || '匿名用户',
    type: safeText(doc.type) || '建议',
    title: safeText(doc.title),
    content: safeText(doc.content),
    status,
    statusText: feedbackStatusLabel(status),
    createdAt: getTimeValue(doc.created_at),
    updatedAt: getTimeValue(doc.updated_at || doc.created_at),
  }
}

export function useFeedback() {
  async function submitFeedback(currentUser, payload) {
    const userId = currentUser?.id || ''
    const title = safeText(payload?.title)
    const content = safeText(payload?.content)
    const type = safeText(payload?.type) || '建议'

    if (!userId) throw new Error('请先登录后再提交反馈')
    if (!title) throw new Error('请填写标题')
    if (!content) throw new Error('请填写内容')

    await db.collection('user_feedback').add({
      user_id: userId,
      username: safeText(currentUser?.username) || '匿名用户',
      type,
      title,
      content,
      status: 'pending',
      status_text: '未处理',
      created_at: new Date(),
      updated_at: new Date(),
    })
  }

  async function fetchFeedbackList({ limit = 200 } = {}) {
    const { data } = await db.collection('user_feedback')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get()
    return (data || []).map(normalizeFeedback)
  }

  async function markFeedbackResolved(item) {
    if (!item?.id) return
    await db.collection('user_feedback').doc(item.id).update({
      status: 'resolved',
      status_text: '已处理',
      updated_at: new Date(),
    })
    item.status = 'resolved'
    item.statusText = '已处理'
  }

  return {
    submitFeedback,
    fetchFeedbackList,
    markFeedbackResolved,
  }
}
