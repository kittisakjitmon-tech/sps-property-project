import { useState, useCallback, useRef, useEffect } from 'react'

const SIMULATED_DURATION_MS = 1200
const SIMULATED_TARGET = 70
const HOLD_AT_TARGET_MS = 200

/**
 * useProgressLoader - Hook สำหรับแสดง Progress Loader (Real หรือ Simulated)
 *
 * ตัวอย่าง:
 *   const loader = useProgressLoader()
 *   loader.startLoading('กำลังบันทึกข้อมูล...')
 *   await saveToFirestore()
 *   loader.updateProgress(100)
 *   loader.stopLoading()
 *
 * หรือใช้ Simulated (ไม่ต้องอัปเดต progress เอง):
 *   loader.startLoading('กำลังบันทึก...', { simulated: true })
 *   await saveToFirestore()
 *   loader.stopLoading()
 */
export function useProgressLoader() {
  const [isActive, setIsActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const simulatedTimerRef = useRef(null)
  const simulatedTargetReached = useRef(false)

  const clearSimulatedTimer = useCallback(() => {
    if (simulatedTimerRef.current) {
      clearInterval(simulatedTimerRef.current)
      simulatedTimerRef.current = null
    }
    simulatedTargetReached.current = false
  }, [])

  useEffect(() => {
    return () => clearSimulatedTimer()
  }, [clearSimulatedTimer])

  const startLoading = useCallback(
    (message = 'กำลังโหลด...', options = {}) => {
      const { simulated = false } = options
      setStatus(message)
      setSubStatus('')
      setProgress(0)
      setIsActive(true)
      simulatedTargetReached.current = false
      clearSimulatedTimer()

      if (simulated) {
        const startTime = Date.now()
        simulatedTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime
          const t = Math.min(1, elapsed / SIMULATED_DURATION_MS)
          const p = Math.round(SIMULATED_TARGET * (1 - Math.pow(1 - t, 1.5)))
          setProgress(p)
          if (p >= SIMULATED_TARGET) {
            simulatedTargetReached.current = true
            clearSimulatedTimer()
          }
        }, 50)
      }
    },
    [clearSimulatedTimer]
  )

  const updateProgress = useCallback((percent, subMessage) => {
    setProgress((prev) => Math.max(prev, Math.min(100, percent)))
    if (subMessage !== undefined) setSubStatus(subMessage)
  }, [])

  const setStatusText = useCallback((message, subMessage) => {
    if (message !== undefined) setStatus(message)
    if (subMessage !== undefined) setSubStatus(subMessage)
  }, [])

  const stopLoading = useCallback(() => {
    clearSimulatedTimer()
    setProgress(100)
    setTimeout(() => {
      setIsActive(false)
      setProgress(0)
      setStatus('')
      setSubStatus('')
    }, HOLD_AT_TARGET_MS + 150)
  }, [clearSimulatedTimer])

  return {
    isActive,
    progress,
    status,
    subStatus,
    startLoading,
    updateProgress,
    setStatus: setStatusText,
    stopLoading,
  }
}
