import { useState, useEffect } from 'react'
import { getLeadsSnapshot, markLeadRead, markLeadContacted } from '../lib/firestore'
import { MessageCircle, Phone, Check, Mail } from 'lucide-react'

export default function LeadsInbox() {
  const [leads, setLeads] = useState([])

  useEffect(() => {
    const unsub = getLeadsSnapshot(setLeads)
    return () => unsub()
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await markLeadRead(id)
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkContacted = async (id) => {
    try {
      await markLeadContacted(id)
    } catch (e) {
      console.error(e)
    }
  }

  const formatDate = (ts) => {
    if (!ts?.toDate) return '-'
    return ts.toDate().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-900">กล่องข้อความ (ลีด)</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-6 py-3 font-medium">ชื่อ</th>
                <th className="px-6 py-3 font-medium">เบอร์โทร</th>
                <th className="px-6 py-3 font-medium">ทรัพย์ที่สนใจ</th>
                <th className="px-6 py-3 font-medium">วันที่</th>
                <th className="px-6 py-3 font-medium text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-t border-slate-100 ${
                    !lead.read ? 'bg-blue-50/50' : ''
                  } hover:bg-slate-50/50`}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{lead.name || '-'}</p>
                    {lead.message && (
                      <p className="text-slate-500 text-sm mt-0.5 line-clamp-2">{lead.message}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`tel:${lead.phone || ''}`}
                      className="inline-flex items-center gap-1 text-blue-900 hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {lead.phone || '-'}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700 line-clamp-2">{lead.propertyTitle || '-'}</p>
                    {lead.propertyId && (
                      <a
                        href={`/properties/${lead.propertyId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm hover:underline"
                      >
                        ดูประกาศ
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!lead.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(lead.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                        >
                          <Check className="h-4 w-4" />
                          อ่านแล้ว
                        </button>
                      )}
                      {!lead.contacted && (
                        <button
                          type="button"
                          onClick={() => handleMarkContacted(lead.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-sm hover:bg-green-200"
                        >
                          <MessageCircle className="h-4 w-4" />
                          ติดต่อแล้ว
                        </button>
                      )}
                      {lead.read && lead.contacted && (
                        <span className="text-slate-500 text-sm">ดำเนินการแล้ว</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Mail className="h-12 w-12 text-slate-300" />
            ยังไม่มีข้อความลีด
          </div>
        )}
      </div>
    </div>
  )
}
