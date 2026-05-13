import { ref } from 'vue'
import { db, cmd } from '@/lib/tcb.js'

export function useMarket() {
  const posts   = ref([])
  const loading = ref(false)
  const dbError = ref(null)

  const mapPost = (p, profileMap) => ({
    id:            p._id,
    userId:        p.user_id,
    title:         p.title,
    description:   p.description,
    category:      p.category,
    budget:        p.budget,
    contact:       p.contact,
    status:        p.status,
    images:        p.images        || [],
    viewCount:     p.view_count     || 0,
    interestCount: p.interest_count || 0,
    createdAt:     p.created_at instanceof Date
                     ? p.created_at.getTime()
                     : new Date(p.created_at).getTime(),
    username:      profileMap[p.user_id]?.username || '匿名用户',
    avatar:        profileMap[p.user_id]?.avatar   || '?',
  })

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

      // Show posts immediately with placeholder names
      posts.value = rows.map(p => mapPost(p, {}))
      loading.value = false

      // Load profiles in background without blocking the list
      const userIds = [...new Set(rows.map(p => p.user_id).filter(Boolean))]
      if (userIds.length) {
        try {
          const { data: profileRows } = await db.collection('profiles')
            .where({ uid: cmd.in(userIds) })
            .limit(userIds.length)
            .get()
          const profileMap = {}
          profileRows.forEach(p => { profileMap[p.uid] = p })
          posts.value = rows.map(p => mapPost(p, profileMap))
        } catch {
          // profiles failed — leave placeholder names, posts already visible
        }
      }
    } catch (e) {
      dbError.value = e.message
      loading.value = false
    }
  }

  const createPost = async (userId, { title, description, category, budget, contact, images = [] }) => {
    try {
      await db.collection('market_posts').add({
        user_id:    userId,
        title,
        description,
        category,
        budget,
        contact,
        images,
        status:     '待解决',
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

  const updatePostStatus = async (postId, status) => {
    try {
      await db.collection('market_posts').doc(postId).update({ status })
    } catch (e) {
      throw new Error('更新失败：' + e.message)
    }
  }

  const updatePost = async (postId, { title, description, category, budget, contact, images }) => {
    try {
      await db.collection('market_posts').doc(postId).update({ title, description, category, budget, contact, images })
    } catch (e) {
      throw new Error('更新失败：' + e.message)
    }
  }

  const incrementViewCount = (postId) => {
    db.collection('market_posts').doc(postId).update({ view_count: cmd.inc(1) }).catch(() => {})
  }

  const fetchMyPosts = async (userId) => {
    loading.value = true
    dbError.value = null
    try {
      const { data: rows } = await db.collection('market_posts')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()
      posts.value = rows.map(p => ({
        id:            p._id,
        userId:        p.user_id,
        title:         p.title,
        description:   p.description,
        category:      p.category,
        budget:        p.budget,
        contact:       p.contact,
        status:        p.status,
        images:        p.images        || [],
        viewCount:     p.view_count     || 0,
        interestCount: p.interest_count || 0,
        createdAt:     p.created_at instanceof Date ? p.created_at.getTime() : new Date(p.created_at).getTime(),
      }))
    } catch (e) {
      dbError.value = e.message
    } finally {
      loading.value = false
    }
  }

  const fetchMyPostsCount = async (userId) => {
    try {
      const { total } = await db.collection('market_posts')
        .where({ user_id: userId })
        .count()
      return total || 0
    } catch (e) {
      dbError.value = e.message
      return 0
    }
  }

  return {
    posts,
    loading,
    dbError,
    fetchPosts,
    fetchMyPosts,
    fetchMyPostsCount,
    createPost,
    deletePost,
    updatePostStatus,
    updatePost,
    incrementViewCount,
  }
}
