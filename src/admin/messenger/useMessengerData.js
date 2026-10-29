import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
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

export function useConversations() {
  return useCollectionSnapshot(
    () => query(collection(adminDb, 'messenger_conversations'), orderBy('lastMessageAt', 'desc'), limit(200)),
    [],
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

export function useMessages(conversationId) {
  return useCollectionSnapshot(
    () => conversationId
      ? query(
        collection(adminDb, 'messenger_conversations', conversationId, 'messages'),
        orderBy('timestamp', 'asc'),
        limitToLast(200),
      )
      : null,
    [conversationId],
    'โหลดข้อความไม่สำเร็จ',
  )
}
