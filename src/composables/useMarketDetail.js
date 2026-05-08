import { ref } from 'vue'
import { db, cmd } from '@/lib/tcb.js'
import { createNotification } from '@/composables/useNotifications.js'


async function loadProfiles(userIds) {
  if (!userIds.length) return {}
  const { data } = await db.collection('profiles')
    .where({ uid: cmd.in(userIds) })
    .limit(userIds.length)
    .get()
  const map = {}
  data.forEach(p => { map[p.uid] = p })
  return map
}

export function useMarketDetail() {
  const comments  = ref([])
  const interests = ref([])

  const fetchComments = async (postId) => {
    try {
      const { data: rows } = await db.collection('market_comments')
        .where({ post_id: postId })
        .orderBy('created_at', 'asc')
        .limit(100)
        .get()
      const profileMap = await loadProfiles([...new Set(rows.map(r => r.user_id).filter(Boolean))])
      comments.value = rows.map(r => ({
        id:        r._id,
        userId:    r.user_id,
        content:   r.content,
        createdAt: r.created_at instanceof Date ? r.created_at.getTime() : new Date(r.created_at).getTime(),
        username:  profileMap[r.user_id]?.username || '匿名用户',
        avatar:    profileMap[r.user_id]?.avatar   || '?',
      }))
    } catch {}
  }

  const addComment = async (postId, userId, content) => {
    await db.collection('market_comments').add({
      post_id:    postId,
      user_id:    userId,
      content:    content.trim(),
      created_at: db.serverDate(),
    })
  }

  const fetchInterests = async (postId) => {
    try {
      const { data: rows } = await db.collection('market_interests')
        .where({ post_id: postId })
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()
      const profileMap = await loadProfiles([...new Set(rows.map(r => r.user_id).filter(Boolean))])
      interests.value = rows.map(r => ({
        id:        r._id,
        userId:    r.user_id,
        contact:   r.contact,
        createdAt: r.created_at instanceof Date ? r.created_at.getTime() : new Date(r.created_at).getTime(),
        username:  profileMap[r.user_id]?.username || '匿名用户',
        avatar:    profileMap[r.user_id]?.avatar   || '?',
      }))
    } catch {}
  }

  const addInterest = async (postId, userId, contact, { postOwnerId, postTitle, fromUsername } = {}) => {
    const { data: existing } = await db.collection('market_interests')
      .where({ post_id: postId, user_id: userId })
      .limit(1)
      .get()
    if (existing?.length > 0) throw new Error('你已经表示过感兴趣了')
    await db.collection('market_interests').add({
      post_id:    postId,
      user_id:    userId,
      contact:    contact.trim(),
      created_at: db.serverDate(),
    })
    db.collection('market_posts').doc(postId).update({ interest_count: cmd.inc(1) }).catch(() => {})
    if (postOwnerId && postOwnerId !== userId) {
      await createNotification(postOwnerId, {
        type:   'interest',
        title:  '有人对你的需求感兴趣',
        body:   `${fromUsername || '有人'} 对「${postTitle}」感兴趣，联系方式：${contact.trim()}`,
        postId,
      })
    }
  }

  const checkInterested = async (postId, userId) => {
    try {
      const { data } = await db.collection('market_interests')
        .where({ post_id: postId, user_id: userId })
        .limit(1)
        .get()
      return data?.length > 0
    } catch { return false }
  }

  return { comments, interests, fetchComments, addComment, fetchInterests, addInterest, checkInterested }
}
