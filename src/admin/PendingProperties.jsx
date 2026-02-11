import { useState, useEffect } from 'react'
import { Building2, Check, X, Eye, Trash2 } from 'lucide-react'
import {
  getPendingPropertiesSnapshot,
  approvePendingProperty,
  rejectPendingProperty,
} from '../lib/firestore'

export default function PendingProperties() {
  const [pendingProperties, setPendingProperties] = useState([])
  const [processingId, setProcessingId] = useState(null)
  const [viewingProperty, setViewingProperty] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    const unsub = getPendingPropertiesSnapshot(setPendingProperties)
    return () => unsub()
  }, [])

  const handleApprove = async (id) => {
    if (!window.confirm('ต้องการอนุมัติประกาศนี้หรือไม่?')) return

    setProcessingId(id)
    try {
      await approvePendingProperty(id)
      alert('อนุมัติประกาศสำเร็จ')
    } catch (error) {
      console.error('Error approving:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id, reason = null) => {
    let finalReason = reason
    if (finalReason === null) {
      const userReason = window.prompt('กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ):', '')
      if (userReason === null) return // User cancelled
      finalReason = userReason || 'ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ'
    }

    setProcessingId(id)
    setRejectingId(id)
    try {
      await rejectPendingProperty(id, finalReason)
      alert('ปฏิเสธประกาศสำเร็จ')
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธ: ' + error.message)
    } finally {
      setProcessingId(null)
      setRejectingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">ตรวจสอบประกาศใหม่</h1>
          <p className="text-slate-600 text-sm mt-1">
            มีประกาศรออนุมัติ {pendingProperties.length} รายการ
          </p>
        </div>
      </div>

      {pendingProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600 text-lg font-medium">ไม่มีประกาศรออนุมัติ</p>
          <p className="text-slate-500 text-sm mt-2">ประกาศใหม่จะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingProperties.map((property) => {
            const coverImage = property.images && property.images.length > 0 ? property.images[0] : null
            const isProcessing = processingId === property.id

            return (
              <div
                key={property.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition"
              >
                {/* Image */}
                {coverImage ? (
                  <div className="aspect-video bg-slate-100">
                    <img
                      src={coverImage}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-slate-300" />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-2 line-clamp-2">
                    {property.title}
                  </h3>

                  <div className="space-y-2 mb-4 text-sm text-slate-600">
                    <p>
                      <span className="font-medium">ประเภท:</span> {property.type}
                    </p>
                    <p>
                      <span className="font-medium">ราคา:</span>{' '}
                      {property.isRental
                        ? `${(property.price / 1000).toFixed(0)}K บาท/เดือน`
                        : `${(property.price / 1_000_000)?.toFixed(1) ?? '-'} ล้านบาท`}
                    </p>
                    <p>
                      <span className="font-medium">พื้นที่:</span> {property.locationDisplay}
                    </p>
                    {property.area > 0 && (
                      <p>
                        <span className="font-medium">ขนาด:</span> {property.area != null && property.area > 0 ? (Number(property.area) / 4).toFixed(1) : '-'} ตร.ว.
                      </p>
                    )}
                    {(property.bedrooms > 0 || property.bathrooms > 0) && (
                      <p>
                        <span className="font-medium">ห้อง:</span> {property.bedrooms} นอน{' '}
                        {property.bathrooms} อาบ
                      </p>
                    )}
                    {property.tags && property.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {property.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-100 text-blue-900 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {property.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-3">{property.description}</p>
                  )}

                  {/* Contact Info */}
                  <div className="border-t border-slate-200 pt-4 mb-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">ข้อมูลติดต่อ:</p>
                    <div className="text-sm text-slate-700 space-y-1">
                      <p>
                        <span className="font-medium">ชื่อ:</span> {property.agentContact?.name || '-'}
                      </p>
                      <p>
                        <span className="font-medium">โทร:</span> {property.agentContact?.phone || '-'}
                      </p>
                      {property.agentContact?.lineId && (
                        <p>
                          <span className="font-medium">LINE:</span> {property.agentContact.lineId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Images Count */}
                  {property.images && property.images.length > 0 && (
                    <div className="mb-4 text-xs text-slate-500">
                      มีรูปภาพ {property.images.length} รูป
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setViewingProperty(property)}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(property.id)}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(property.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View Property Modal */}
      {viewingProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-blue-900">รายละเอียดประกาศ</h2>
              <button
                type="button"
                onClick={() => setViewingProperty(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Images */}
              {viewingProperty.images && viewingProperty.images.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-3">รูปภาพ</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {viewingProperty.images.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                        <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Property Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">ชื่อประกาศ</p>
                  <p className="text-slate-900 font-semibold">{viewingProperty.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">ประเภท</p>
                  <p className="text-slate-900">{viewingProperty.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">ราคา</p>
                  <p className="text-slate-900">
                    {viewingProperty.isRental
                      ? `${(viewingProperty.price / 1000).toFixed(0)}K บาท/เดือน`
                      : `${(viewingProperty.price / 1_000_000)?.toFixed(1) ?? '-'} ล้านบาท`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">พื้นที่</p>
                  <p className="text-slate-900">{viewingProperty.locationDisplay}</p>
                </div>
                {viewingProperty.area > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">ขนาด</p>
                    <p className="text-slate-900">{viewingProperty.area != null && viewingProperty.area > 0 ? (Number(viewingProperty.area) / 4).toFixed(1) : '-'} ตร.ว.</p>
                  </div>
                )}
                {(viewingProperty.bedrooms > 0 || viewingProperty.bathrooms > 0) && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">ห้อง</p>
                    <p className="text-slate-900">
                      {viewingProperty.bedrooms} นอน {viewingProperty.bathrooms} อาบ
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewingProperty.description && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">รายละเอียด</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{viewingProperty.description}</p>
                </div>
              )}

              {/* Tags */}
              {viewingProperty.tags && viewingProperty.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">แท็ก</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingProperty.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-900 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-medium text-slate-500 mb-3">ข้อมูลติดต่อ</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">ชื่อ</p>
                    <p className="text-slate-900">{viewingProperty.agentContact?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">โทรศัพท์</p>
                    <p className="text-slate-900">{viewingProperty.agentContact?.phone || '-'}</p>
                  </div>
                  {viewingProperty.agentContact?.lineId && (
                    <div>
                      <p className="text-xs text-slate-500">LINE ID</p>
                      <p className="text-slate-900">{viewingProperty.agentContact.lineId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    handleApprove(viewingProperty.id)
                    setViewingProperty(null)
                  }}
                  disabled={processingId === viewingProperty.id}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  อนุมัติประกาศ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt('กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ):', '')
                    if (reason !== null) {
                      handleReject(viewingProperty.id, reason || 'ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ')
                      setViewingProperty(null)
                    }
                  }}
                  disabled={processingId === viewingProperty.id}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ปฏิเสธ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
