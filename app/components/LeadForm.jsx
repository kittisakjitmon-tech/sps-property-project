import { useState, useId, useEffect } from 'react'
import { createAppointment } from '../lib/firestore'
import { usePublicAuth } from '../context/PublicAuthContext'

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 && /^0\d{9}$/.test(digits)
}

export default function LeadForm({ propertyId, propertyTitle, propertyPrice, isRental, onSuccess, onError }) {
  const { user, isAgent } = usePublicAuth()
  const activeTab = user && isAgent() ? 'agent' : 'customer'
  const baseId = useId()

  // Today's date - set only on client to avoid SSR mismatch
  const [today, setToday] = useState('')

  // Form fields for Customer tab
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')

  // Form fields for Agent tab
  const [agentCustomerName, setAgentCustomerName] = useState('')
  const [agentName, setAgentName] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [agentVisitDate, setAgentVisitDate] = useState('')
  const [agentVisitTime, setAgentVisitTime] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Set today's date on client only
  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0])
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (activeTab === 'customer') {
      if (!customerName.trim()) newErrors.customerName = 'กรุณากรอกชื่อลูกค้า'
      if (!customerPhone.trim()) newErrors.customerPhone = 'กรุณากรอกเบอร์โทร'
      else if (!validatePhone(customerPhone.trim())) newErrors.customerPhone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)'
      if (!visitDate.trim()) newErrors.visitDate = 'กรุณาเลือกวันที่เข้าชม'
      if (!visitTime.trim()) newErrors.visitTime = 'กรุณาเลือกเวลา'
    } else {
      if (!agentCustomerName.trim()) newErrors.agentCustomerName = 'กรุณากรอกชื่อลูกค้า'
      if (!agentName.trim()) newErrors.agentName = 'กรุณากรอกชื่อเอเจ้นท์ที่ดูแล'
      if (!agentPhone.trim()) newErrors.agentPhone = 'กรุณากรอกเบอร์โทรเอเจ้นท์'
      else if (!validatePhone(agentPhone.trim())) newErrors.agentPhone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)'
      if (!agentVisitDate.trim()) newErrors.agentVisitDate = 'กรุณาเลือกวันที่เข้าชม'
      if (!agentVisitTime.trim()) newErrors.agentVisitTime = 'กรุณาเลือกเวลา'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsLoading(true)
    setErrors({})
    try {
      const appointmentData =
        activeTab === 'customer'
          ? {
              type: 'Customer',
              contactName: customerName.trim(),
              tel: customerPhone.trim(),
              date: visitDate.trim(),
              time: visitTime.trim(),
              propertyId: propertyId || '',
              propertyTitle: propertyTitle || '',
            }
          : {
              type: 'Agent',
              agentName: agentName.trim(),
              contactName: agentCustomerName.trim(),
              tel: agentPhone.trim(),
              date: agentVisitDate.trim(),
              time: agentVisitTime.trim(),
              propertyId: propertyId || '',
              propertyTitle: propertyTitle || '',
            }

      await createAppointment(appointmentData)

      // Reset form
      if (activeTab === 'customer') {
        setCustomerName('')
        setCustomerPhone('')
        setVisitDate('')
        setVisitTime('')
      } else {
        setAgentCustomerName('')
        setAgentName('')
        setAgentPhone('')
        setAgentVisitDate('')
        setAgentVisitTime('')
      }

      onSuccess?.('ส่งคำขอนัดเยี่ยมชมสำเร็จ! เจ้าหน้าที่จะติดต่อกลับเร็วๆ นี้')
    } catch (err) {
      console.error(err)
      onError?.()
    } finally {
      setIsLoading(false)
    }
  }

  const fieldClass = (hasError) =>
    `w-full px-4 py-2.5 rounded-lg border text-sm bg-white transition-colors ${
      hasError ? 'border-amber-500 focus:ring-amber-200' : 'border-slate-200 focus:ring-blue-200'
    } focus:ring-2 focus:outline-none`

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          className="flex-1 px-4 py-2 text-sm font-medium bg-blue-900 text-white rounded-t-lg"
          disabled
        >
          {activeTab === 'customer' ? 'สำหรับลูกค้า' : 'สำหรับเอเจน'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="text-base font-semibold text-blue-900">
          {activeTab === 'customer' ? 'ลูกค้านัดเข้าชมโครงการ' : 'เอเจ้นท์พาลูกค้าเข้าชม'}
        </h4>

        {activeTab === 'customer' ? (
          <>
            <div>
              <label htmlFor={`${baseId}-customerName`} className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อลูกค้า *
              </label>
              <input
                id={`${baseId}-customerName`}
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setErrors((p) => ({ ...p, customerName: '' })) }}
                placeholder="กรอกชื่อลูกค้า"
                className={fieldClass(errors.customerName)}
              />
              {errors.customerName && <p className="mt-1 text-xs text-amber-600">{errors.customerName}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-customerPhone`} className="block text-sm font-medium text-slate-700 mb-1">
                เบอร์โทร *
              </label>
              <input
                id={`${baseId}-customerPhone`}
                type="tel"
                value={customerPhone}
                onChange={(e) => { setCustomerPhone(e.target.value); setErrors((p) => ({ ...p, customerPhone: '' })) }}
                placeholder="เช่น 0812345678"
                className={fieldClass(errors.customerPhone)}
              />
              {errors.customerPhone && <p className="mt-1 text-xs text-amber-600">{errors.customerPhone}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-visitDate`} className="block text-sm font-medium text-slate-700 mb-1">
                วันที่เข้าชม *
              </label>
              <input
                id={`${baseId}-visitDate`}
                type="date"
                value={visitDate}
                onChange={(e) => { setVisitDate(e.target.value); setErrors((p) => ({ ...p, visitDate: '' })) }}
                min={today}
                className={fieldClass(errors.visitDate)}
              />
              {errors.visitDate && <p className="mt-1 text-xs text-amber-600">{errors.visitDate}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-visitTime`} className="block text-sm font-medium text-slate-700 mb-1">
                เวลา *
              </label>
              <input
                id={`${baseId}-visitTime`}
                type="time"
                value={visitTime}
                onChange={(e) => { setVisitTime(e.target.value); setErrors((p) => ({ ...p, visitTime: '' })) }}
                className={fieldClass(errors.visitTime)}
              />
              {errors.visitTime && <p className="mt-1 text-xs text-amber-600">{errors.visitTime}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-propertyId`} className="block text-sm font-medium text-slate-700 mb-1">
                รหัสทรัพย์
              </label>
              <input
                id={`${baseId}-propertyId`}
                type="text"
                value={propertyId || ''}
                readOnly
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor={`${baseId}-agentCustomerName`} className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อลูกค้า *
              </label>
              <input
                id={`${baseId}-agentCustomerName`}
                type="text"
                value={agentCustomerName}
                onChange={(e) => { setAgentCustomerName(e.target.value); setErrors((p) => ({ ...p, agentCustomerName: '' })) }}
                placeholder="กรอกชื่อลูกค้า"
                className={fieldClass(errors.agentCustomerName)}
              />
              {errors.agentCustomerName && <p className="mt-1 text-xs text-amber-600">{errors.agentCustomerName}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-agentName`} className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อเอเจ้นท์ที่ดูแล *
              </label>
              <input
                id={`${baseId}-agentName`}
                type="text"
                value={agentName}
                onChange={(e) => { setAgentName(e.target.value); setErrors((p) => ({ ...p, agentName: '' })) }}
                placeholder="กรอกชื่อเอเจ้นท์"
                className={fieldClass(errors.agentName)}
              />
              {errors.agentName && <p className="mt-1 text-xs text-amber-600">{errors.agentName}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-agentPhone`} className="block text-sm font-medium text-slate-700 mb-1">
                เบอร์โทรเอเจ้นท์ *
              </label>
              <input
                id={`${baseId}-agentPhone`}
                type="tel"
                value={agentPhone}
                onChange={(e) => { setAgentPhone(e.target.value); setErrors((p) => ({ ...p, agentPhone: '' })) }}
                placeholder="เช่น 0812345678"
                className={fieldClass(errors.agentPhone)}
              />
              {errors.agentPhone && <p className="mt-1 text-xs text-amber-600">{errors.agentPhone}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-agentVisitDate`} className="block text-sm font-medium text-slate-700 mb-1">
                วันที่เข้าชม *
              </label>
              <input
                id={`${baseId}-agentVisitDate`}
                type="date"
                value={agentVisitDate}
                onChange={(e) => { setAgentVisitDate(e.target.value); setErrors((p) => ({ ...p, agentVisitDate: '' })) }}
                min={today}
                className={fieldClass(errors.agentVisitDate)}
              />
              {errors.agentVisitDate && <p className="mt-1 text-xs text-amber-600">{errors.agentVisitDate}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-agentVisitTime`} className="block text-sm font-medium text-slate-700 mb-1">
                เวลา *
              </label>
              <input
                id={`${baseId}-agentVisitTime`}
                type="time"
                value={agentVisitTime}
                onChange={(e) => { setAgentVisitTime(e.target.value); setErrors((p) => ({ ...p, agentVisitTime: '' })) }}
                className={fieldClass(errors.agentVisitTime)}
              />
              {errors.agentVisitTime && <p className="mt-1 text-xs text-amber-600">{errors.agentVisitTime}</p>}
            </div>
            <div>
              <label htmlFor={`${baseId}-agentPropertyId`} className="block text-sm font-medium text-slate-700 mb-1">
                รหัสทรัพย์
              </label>
              <input
                id={`${baseId}-agentPropertyId`}
                type="text"
                value={propertyId || ''}
                readOnly
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 hover:ring-2 hover:ring-yellow-400 hover:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังส่งข้อมูล…
            </>
          ) : (
            'ส่งคำขอนัดเยี่ยมชม'
          )}
        </button>
      </form>
    </div>
  )
}
