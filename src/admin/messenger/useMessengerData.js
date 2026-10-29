import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { adminDb } from '../../lib/firebase'
import { useAdminAuth } from '../../context/AdminAuthContext'

const API_URL = import.meta.env.VITE_FACEBOOK_MESSENGER_API_URL || '/api/admin/messenger'

export function useMessengerApi() {
  const { user } = useAdminAuth()

  return useCallback(async body => {
    if (!user) throw new Error('กรุณาเข้าสู่ระบบใหม่')
    const token = await user.getIdToken()
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'เรียก API ไม่สำเร็จ')
    return data
  }, [user])
}

function useCollectionSnapshot(buildQuery, deps, errorMessage) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const builtQuery = buildQuery()
    if (!builtQuery) {
      setItems([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    return onSnapshot(builtQuery, snapshot => {
      setItems(snapshot.docs.map(document => ({ id: document.id, ...document.data() })))
      setLoading(false)
      setError('')
    }, snapshotError => {
      console.error(errorMessage, snapshotError)
      setError(errorMessage)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { items, loading, error }
}

export const PAGE_SIZE = 100

export function useConversations(limitCount = PAGE_SIZE) {
  return useCollectionSnapshot(
    () => query(collection(adminDb, 'messenger_conversations'), orderBy('lastMessageAt', 'desc'), limit(limitCount)),
    [limitCount],
    'โหลดห้องสนทนาไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และ Firestore Rules',
  )
}

export function useMessengerPages() {
  return useCollectionSnapshot(
    () => query(collection(adminDb, 'messenger_pages'), orderBy('name')),
    [],
    'โหลดรายชื่อเพจไม่สำเร็จ',
  )
}

export function useMessages(conversationId, limitCount = PAGE_SIZE) {
  return useCollectionSnapshot(
    () => conversationId
      ? query(
        collection(adminDb, 'messenger_conversations', conversationId, 'messages'),
        orderBy('timestamp', 'asc'),
        limitToLast(limitCount),
      )
      : null,
    [conversationId, limitCount],
    'โหลดข้อความไม่สำเร็จ',
  )
}

// Total unread across all conversations, for the sidebar badge and tab title.
export function useMessengerUnreadCount(enabled) {
  const { items } = useCollectionSnapshot(
    () => enabled
      ? query(collection(adminDb, 'messenger_conversations'), where('unreadCount', '>', 0), limit(500))
      : null,
    [enabled],
    'โหลดจำนวนข้อความที่ยังไม่อ่านไม่สำเร็จ',
  )
  return items.reduce((sum, item) => sum + (item.unreadCount || 0), 0)
}
