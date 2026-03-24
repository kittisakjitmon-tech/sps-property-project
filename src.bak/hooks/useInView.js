import { useState, useEffect, useRef } from 'react'

/**
 * Hook ตรวจว่า element อยู่ใน viewport หรือไม่ (Intersection Observer)
 * @param {object} options - { rootMargin, threshold, triggerOnce }
 * @returns {[React.RefObject, boolean]} [ref, isInView]
 */
export function useInView(options = {}) {
  const { rootMargin = '0px', threshold = 0.1, triggerOnce = true } = options
  const [isInView, setIsInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (triggerOnce) observer.unobserve(el)
        } else if (!triggerOnce) {
          setIsInView(false)
        }
      },
      { rootMargin, threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold, triggerOnce])

  return [ref, isInView]
}
