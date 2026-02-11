/**
 * Activity Logger Service - บันทึกกิจกรรมลง Firestore
 * Collection: activities
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const ACTIVITIES_COLLECTION = 'activities'

/**
 * บันทึกกิจกรรมลง Firestore
 * @param {Object} params
 * @param {string} params.action - ประเภทการกระทำ (เช่น 'CREATE_PROPERTY', 'UPDATE_PRICE', 'DELETE_PROPERTY')
 * @param {string} params.target - ชื่อของสิ่งที่ถูกกระทำ (เช่น 'บ้านพูลวิลล่า 01')
 * @param {string} [params.details] - รายละเอียดเพิ่มเติม (เช่น 'เปลี่ยนราคาจาก 5.0M -> 4.5M')
 * @param {Object} params.currentUser - ผู้ใช้งานปัจจุบัน { email, role }
 * @param {string} [params.status='SUCCESS'] - สถานะ
 * @returns {Promise<string>} document ID
 */
export async function logActivity({ action, target, details, currentUser, status = 'SUCCESS' }) {
  if (!currentUser?.email) {
    console.warn('[ActivityLogger] No currentUser.email - skip logging')
    return null
  }

  const email = String(currentUser.email)
  const role = currentUser.role || 'member'
  const username = email.includes('@') ? email.split('@')[0] : email

  const payload = {
    action,
    target: target || '-',
    details: details || '',
    timestamp: serverTimestamp(),
    status,
    performedBy: {
      email,
      role,
      username,
    },
  }

  try {
    const docRef = await addDoc(collection(db, ACTIVITIES_COLLECTION), payload)
    return docRef.id
  } catch (err) {
    console.error('[ActivityLogger] Failed to log activity:', err)
    return null
  }
}
