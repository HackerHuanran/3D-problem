import { ref } from 'vue'
import { db, cmd } from '@/lib/tcb.js'

export function useMarket() {
  const posts   = ref([])
  const loading = ref(false)
  const dbError = ref(null)

  const fetchPosts = async (category = null) => {
    loading.value = true
    dbError.value = null

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('网络超时，请检查连接后刷新')), 10000)
      )

      let q = db.collection('market_posts')
        .orderBy('created_at', 'desc')
        .limit(100)

      if (category) q = q.where({ category })

      const { data: rows } = await Promise.race([q.get(), timeout])

      const userIds = [...new Set(rows.map(p => p.user_id).filter(Boolean))]
      let profileMap = {}
      if (userIds.length) {
        const { data: profileRows } = await db.collection('profiles')
          .where({ uid: cmd.in(userIds) })
          .limit(userIds.length)
          .get()
        profileRows.forEach(p => { profileMap[p.uid] = p })
      }

      posts.value = rows.map(p => ({
        id:          p._id,
        userId:      p.user_id,
        title:       p.title,
        description: p.description,
        category:    p.category,
        budget:      p.budget,
        contact:     p.contact,
        status:      p.status,
        createdAt:   p.created_at instanceof Date
                       ? p.created_at.getTime()
                       : new Date(p.created_at).getTime(),
        username:    profileMap[p.user_id]?.username || '匿名用户',
        avatar:      profileMap[p.user_id]?.avatar   || '?',
      }))
    } catch (e) {
      dbError.value = e.message
    } finally {
      loading.value = false
    }
  }

  const createPost = async (userId, { title, description, category, budget, contact }) => {
    try {
      await db.collection('market_posts').add({
        user_id:    userId,
        title,
        description,
        category,
        budget,
        contact,
        status:     '进行中',
        created_at: db.serverDate(),
      })
    } catch (e) {
      throw new Error('发布失败：' + e.message)
    }
  }

  const deletePost = async (postId) => {
    try {
      await db.collection('market_posts').doc(postId).remove()
    } catch (e) {
      throw new Error('删除失败')
    }
  }

  return { posts, loading, dbError, fetchPosts, createPost, deletePost }
}
