import { useEffect, useRef, useState } from 'react'
import { readCompletion, submitCompletion } from './completionApi'
import { completedValues, completionValues } from './completionForm'

export default function useCompletionRequest(token) {
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    readCompletion(token).then(result => {
      if (active) {
        setRequest(result)
        setValues(completedValues(result))
        setNotice(result.state === 'completed' ? 'หน้านี้ได้ลงข้อมูลครบแล้ว' : '')
        setError('')
        setLoading(false)
      }
    }).catch(err => {
      if (active) { setError(err.message || 'เปิดข้อมูลบ้านไม่สำเร็จ กรุณาลองอีกครั้ง'); setLoading(false) }
    })
    return () => { active = false }
  }, [token, retry])

  async function save(event) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setSaving(true)
    setError('')
    try {
      await submitCompletion(token, completionValues(request.missingFields, values, request.form), request.revision)
      const result = await readCompletion(token)
      setRequest(result)
      setValues(completedValues(result))
      setNotice(request.state === 'completed' ? 'บันทึกการแก้ไขแล้ว' : 'บันทึกและเผยแพร่บ้านแล้ว')
    }
    catch (err) { setError(err.message || 'บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง') }
    finally { submitting.current = false; setSaving(false) }
  }

  function reload() {
    setLoading(true)
    setError('')
    setRetry(value => value + 1)
  }

  return { request, loading, error, values, saving, save, reload, notice, dismissNotice: () => setNotice(''), change: (key, value) => setValues(current => ({ ...current, [key]: value })) }
}
