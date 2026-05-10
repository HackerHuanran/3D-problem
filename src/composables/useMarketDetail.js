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
  const likedCommentIds = ref(new Set())

  const fetchComments = async (postId, userId) => {
    try {
      const { data: rows } = await db.collection('market_comments')
        .where({ post_id: postId })
        .orderBy('created_at', 'asc')
        .limit(100)
        .get()
      const profileMap = await loadProfiles([...new Set(rows.map(r => r.user_id).filter(Boolean))])

      // 拉取当前用户的点赞记录
      if (userId) {
        try {
          const { data: likes } = await db.collection('comment_likes')
            .where({ post_id: postId, user_id: userId })
            .limit(200).get()
          likedCommentIds.value = new Set(likes.map(l => l.comment_id))
        } catch {}
      }

      const toRow = r => ({
        id:         r._id,
        userId:     r.user_id,
        content:    r.content,
        isAccepted: r.is_accepted || false,
        likeCount:  r.like_count  || 0,
        createdAt:  r.created_at instanceof Date ? r.created_at.getTime() : new Date(r.created_at).getTime(),
        username:   profileMap[r.user_id]?.username || '匿名用户',
        avatar:     profileMap[r.user_id]?.avatar   || '?',
      })

      const accepted = rows.filter(r => r.is_accepted).map(toRow)
      const rest     = rows.filter(r => !r.is_accepted).map(toRow)
        .sort((a, b) => b.likeCount - a.likeCount || a.createdAt - b.createdAt)
      comments.value = [...accepted, ...rest]
    } catch {}
  }

  const toggleLike = async (commentId, postId, userId) => {
    if (!userId) throw new Error('请先登录')
    const liked = likedCommentIds.value.has(commentId)
    const next = new Set(likedCommentIds.value)
    liked ? next.delete(commentId) : next.add(commentId)
    likedCommentIds.value = next
    const c = comments.value.find(c => c.id === commentId)
    if (c) c.likeCount = Math.max(0, (c.likeCount || 0) + (liked ? -1 : 1))
    try {
      if (liked) {
        const { data } = await db.collection('comment_likes')
          .where({ comment_id: commentId, user_id: userId }).limit(1).get()
        if (data?.length) await db.collection('comment_likes').doc(data[0]._id).remove()
        await db.collection('market_comments').doc(commentId).update({ like_count: cmd.inc(-1) })
      } else {
        await db.collection('comment_likes').add({
          comment_id: commentId, post_id: postId, user_id: userId, created_at: db.serverDate(),
        })
        await db.collection('market_comments').doc(commentId).update({ like_count: cmd.inc(1) })
      }
    } catch {
      // 回滚
      const rb = new Set(likedCommentIds.value)
      liked ? rb.add(commentId) : rb.delete(commentId)
      likedCommentIds.value = rb
      if (c) c.likeCount = Math.max(0, (c.likeCount || 0) + (liked ? 1 : -1))
    }
  }

  const addComment = async (postId, userId, content, { postOwnerId, postTitle, fromUsername } = {}) => {
    await db.collection('market_comments').add({
      post_id:    postId,
      user_id:    userId,
      content:    content.trim(),
      created_at: db.serverDate(),
    })
    if (postOwnerId && postOwnerId !== userId) {
      createNotification(postOwnerId, {
        type:  'answer',
        title: '你的求助有新回答',
        body:  `${fromUsername || '有人'} 回答了「${postTitle}」`,
        postId,
      }).catch(() => {})
    }
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

  const acceptAnswer = async (commentId, postId) => {
    // 取消旧的采纳
    const { data: old } = await db.collection('market_comments')
      .where({ post_id: postId, is_accepted: true }).limit(10).get()
    await Promise.all(old.map(c => db.collection('market_comments').doc(c._id).update({ is_accepted: false })))
    // 采纳新回答
    await db.collection('market_comments').doc(commentId).update({ is_accepted: true })
    // 帖子标记已解决
    await db.collection('market_posts').doc(postId).update({ status: '已解决' })
  }

  return { comments, interests, likedCommentIds, fetchComments, addComment, fetchInterests, addInterest, checkInterested, acceptAnswer, toggleLike }
}
