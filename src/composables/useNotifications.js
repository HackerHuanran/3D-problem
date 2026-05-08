import { ref } from 'vue'
import { db } from '@/lib/tcb.js'

export async function createNotification(recipientId, { type, title, body, postId = null }) {
  if (!recipientId) return
  try {
    await db.collection('notifications').add({
      user_id:    recipientId,
      type,
      title,
      body,
      post_id:    postId,
      read:       false,
      created_at: db.serverDate(),
    })
  } catch {}
}

export function useNotifications() {
  const notifications = ref([])
  const unreadCount   = ref(0)

  const fetchNotifications = async (userId) => {
    if (!userId) { notifications.value = []; unreadCount.value = 0; return }
    try {
      const { data } = await db.collection('notifications')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(50)
        .get()
      notifications.value = data.map(n => ({
        id:        n._id,
        type:      n.type,
        title:     n.title,
        body:      n.body,
        read:      n.read ?? false,
        createdAt: n.created_at instanceof Date ? n.created_at.getTime() : new Date(n.created_at).getTime(),
      }))
      unreadCount.value = notifications.value.filter(n => !n.read).length
    } catch {}
  }

  const markAllRead = async () => {
    const unread = notifications.value.filter(n => !n.read)
    if (!unread.length) return
    try {
      await Promise.all(unread.map(n =>
        db.collection('notifications').doc(n.id).update({ read: true })
      ))
      notifications.value.forEach(n => { n.read = true })
      unreadCount.value = 0
    } catch {}
  }

  return { notifications, unreadCount, fetchNotifications, markAllRead }
}
