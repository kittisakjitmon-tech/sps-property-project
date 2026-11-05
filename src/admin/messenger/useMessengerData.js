import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { adminDb } from '../../lib/firebase'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { describeNetworkFailure, resolveApiUrl } from './apiUrl'
import { toPropertyOption } from './propertySearch'

const API_URL = resolveApiUrl(import.meta.env.VITE_FACEBOOK_MESSENGER_API_URL, typeof window === 'undefined' ? '' : window.location.hostname)

export function useMessengerApi() {
  const { user } = useAdminAuth()

  return useCallback(async body => {
    if (!user) throw new Error('กรุณาเข้าสู่ระบบใหม่')
    const token = await user.getIdToken()
    let response
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (networkError) {
      console.error('เรียกหลังบ้านไม่สำเร็จ', API_URL, networkError)
      throw new Error(describeNetworkFailure(API_URL, window.location.hostname))
    }
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

// Available listings the team can attach to a chat: [{ code, title }].
export function usePropertyOptions() {
  const { items } = useCollectionSnapshot(
    () => query(collection(adminDb, 'properties'), where('status', '==', 'available')),
    [],
    'โหลดรายการทรัพย์ไม่สำเร็จ',
  )
  return useMemo(
    () => items
      .filter(item => item.displayId)
      .map(toPropertyOption)
      .sort((a, b) => a.code.localeCompare(b.code)),
    [items],
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

// Global AI assistant settings (messenger_settings/ai). Missing document means off.
export function useBotSettings() {
  const [settings, setSettings] = useState({ enabled: false, requirePropertyForBot: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => onSnapshot(doc(adminDb, 'messenger_settings', 'ai'), snapshot => {
    setSettings({ enabled: false, requirePropertyForBot: false, ...snapshot.data() })
    setLoading(false)
  }, snapshotError => {
    console.error('โหลดสถานะบอทไม่สำเร็จ', snapshotError)
    setLoading(false)
  }), [])

  return { settings, loading }
}
