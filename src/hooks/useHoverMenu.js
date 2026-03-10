import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * useHoverMenu — จัดการ dropdown menu ที่เปิด/ปิดด้วย hover + click
 * @param {number} delay - เวลา (ms) ก่อนปิด menu หลัง mouse leave (default: 100)
 */
export function useHoverMenu(delay = 100) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const openMenu = useCallback(() => {
    clearTimer()
    setOpen(true)
  }, [clearTimer])

  const closeMenu = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  const scheduleClose = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      setOpen(false)
      timerRef.current = null
    }, delay)
  }, [clearTimer, delay])

  const toggle = useCallback(() => {
    clearTimer()
    setOpen((prev) => !prev)
  }, [clearTimer])

  // cleanup เมื่อ component unmount
  useEffect(() => () => clearTimer(), [clearTimer])

  return { open, openMenu, closeMenu, scheduleClose, toggle }
}
