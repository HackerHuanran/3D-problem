// src/composables/useCommunity.js
// 评论和补充方案 —— 对接 Supabase 数据库

import { ref } from 'vue'
import { supabase } from '@/lib/supabase.js'

export function useCommunity() {

  // ── 评论 ──
  const getComments = async (problemId) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, content, created_at,
        profiles ( username, avatar ),
        likes ( user_id )
      `)
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); return [] }
    return data.map(c => ({
      id: c.id,
      userId: c.profiles?.id,
      username: c.profiles?.username || '匿名用户',
      avatar: c.profiles?.avatar || '?',
      content: c.content,
      createdAt: new Date(c.created_at).getTime(),
      likes: c.likes.map(l => l.user_id)
    }))
  }

  const addComment = async (problemId, userId, content) => {
    const { error } = await supabase
      .from('comments')
      .insert({ problem_id: problemId, user_id: userId, content })
    if (error) throw new Error('发表失败：' + error.message)
  }

  const deleteComment = async (commentId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) throw new Error('删除失败')
  }

  const toggleCommentLike = async (commentId, userId) => {
    // 查是否已点赞
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('target_id', commentId)
      .eq('user_id', userId)
      .maybeSingle()

    if (data) {
      await supabase.from('likes').delete().eq('id', data.id)
    } else {
      await supabase.from('likes').insert({ target_id: commentId, user_id: userId, target_type: 'comment' })
    }
  }

  // ── 补充方案 ──
  const getSolutions = async (problemId) => {
    const { data, error } = await supabase
      .from('solutions')
      .select(`
        id, title, detail, created_at,
        profiles ( username, avatar ),
        likes ( user_id )
      `)
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); return [] }
    return data
      .map(s => ({
        id: s.id,
        userId: s.profiles?.id,
        username: s.profiles?.username || '匿名用户',
        avatar: s.profiles?.avatar || '?',
        title: s.title,
        detail: s.detail,
        createdAt: new Date(s.created_at).getTime(),
        likes: s.likes.map(l => l.user_id)
      }))
      .sort((a, b) => b.likes.length - a.likes.length || b.createdAt - a.createdAt)
  }

  const addSolution = async (problemId, userId, title, detail) => {
    const { error } = await supabase
      .from('solutions')
      .insert({ problem_id: problemId, user_id: userId, title, detail })
    if (error) throw new Error('发布失败：' + error.message)
  }

  const deleteSolution = async (solutionId) => {
    const { error } = await supabase.from('solutions').delete().eq('id', solutionId)
    if (error) throw new Error('删除失败')
  }

  const toggleSolutionLike = async (solutionId, userId) => {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('target_id', solutionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (data) {
      await supabase.from('likes').delete().eq('id', data.id)
    } else {
      await supabase.from('likes').insert({ target_id: solutionId, user_id: userId, target_type: 'solution' })
    }
  }

  return {
    getComments, addComment, deleteComment, toggleCommentLike,
    getSolutions, addSolution, deleteSolution, toggleSolutionLike
  }
}
