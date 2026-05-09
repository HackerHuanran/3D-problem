import { db } from '@/lib/tcb.js'

export function useReport() {
  const submitReport = async (userId, { type, targetId, targetTitle, reason }) => {
    await db.collection('reports').add({
      type,
      targetId,
      targetTitle,
      reporterId: userId,
      reason,
      status:     'pending',
      createdAt:  db.serverDate(),
    })
  }
  return { submitReport }
}
