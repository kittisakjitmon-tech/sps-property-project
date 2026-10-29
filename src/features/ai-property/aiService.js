import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { adminApp } from '../../lib/firebase'

const functions = getFunctions(adminApp, 'us-central1')
if (import.meta.env.DEV && import.meta.env.VITE_USE_AI_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
const call = httpsCallable(functions, 'aiPropertyAssistant', { timeout: 180000 })
export async function requestAssistant(payload) {
  try {
    return (await call(payload)).data
  } catch (err) {
    if (['functions/not-found', 'functions/internal', 'functions/unavailable'].includes(err.code)) {
      throw new Error('ยังติดต่อบริการ AI ไม่ได้ ผู้ดูแลต้องตั้งค่า OpenRouter และติดตั้งบริการ AI ก่อน หากตั้งค่าแล้วกรุณาลองใหม่')
    }
    throw new Error(err.message || 'ติดต่อ AI ไม่สำเร็จ กรุณาลองใหม่')
  }
}
