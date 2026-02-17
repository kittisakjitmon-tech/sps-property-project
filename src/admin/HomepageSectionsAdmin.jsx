import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Plus, Trash2, GripVertical, Check, AlertCircle, LayoutList, Search } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getHomepageSectionsSnapshot,
  createHomepageSection,
  updateHomepageSectionById,
  deleteHomepageSectionById,
  batchUpdateHomepageSectionOrders,
  getPropertiesSnapshot,
  filterPropertiesByCriteria,
  addTagToProperty,
  removeTagFromProperty,
} from '../lib/firestore'

const CATEGORIES = [
  { value: 'บ้านเดี่ยว', label: 'บ้านเดี่ยว' },
  { value: 'คอนโดมิเนียม', label: 'คอนโดมิเนียม' },
  { value: 'ทาวน์โฮม', label: 'ทาวน์โฮม' },
  { value: 'วิลล่า', label: 'วิลล่า' },
  { value: 'บ้านเช่า', label: 'บ้านเช่า' },
]

function SortableSectionCard({ section, index, onEdit, onDelete, onToggle, isDeleting }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all ${
        isDragging ? 'border-blue-500 shadow-lg scale-105 z-50' : 'border-slate-200 hover:border-blue-300'
      } ${!section.isActive ? 'opacity-60' : ''}`}
    >
      <div {...attributes} {...listeners} className="absolute top-3 left-3 z-20 p-2 bg-white/90 rounded-lg cursor-grab active:cursor-grabbing shadow">
        <GripVertical className="h-5 w-5 text-slate-600" />
      </div>
      <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-blue-900 text-white text-sm font-bold rounded-lg">
        #{index + 1}
      </div>
      <div className="absolute top-3 left-16 z-20">
        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${section.isActive ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'}`}>
          {section.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
        </span>
      </div>
      <div className="p-6 pt-14">
        <h3 className="font-semibold text-blue-900 mb-1">{section.title || '-'}</h3>
        <p className="text-sm text-slate-600 mb-3 line-clamp-1">{section.subtitle || '-'}</p>
        <p className="text-xs text-slate-500 mb-4">
          ประเภท: <span className="font-medium">{section.type === 'manual' ? 'เลือกเอง' : 'ดึงอัตโนมัติ'}</span>
          {section.type === 'manual' && section.propertyIds?.length > 0 && (
            <> • {section.propertyIds.length} ทรัพย์</>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(section.id, !section.isActive)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${section.isActive ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
          >
            {section.isActive ? 'ปิด' : 'เปิด'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(section)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-900 hover:bg-blue-200 transition"
          >
            แก้ไข
          </button>
          <button
            type="button"
            onClick={() => onDelete(section.id)}
            disabled={isDeleting === section.id}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition disabled:opacity-50"
          >
            ลบ
          </button>
        </div>
      </div>
    </div>
  )
}

function PropertySelector({ properties, selectedIds, onChange }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (!search.trim()) return properties
    const q = search.toLowerCase()
    return properties.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.locationDisplay || '').toLowerCase().includes(q) ||
        (p.location?.district || '').toLowerCase().includes(q) ||
        (p.location?.province || '').toLowerCase().includes(q)
    )
  }, [properties, search])

  const toggle = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อบ้าน / ทำเล..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">ไม่พบทรัพย์</p>
        ) : (
          filtered.map((p) => {
            const checked = selectedIds.includes(p.id)
            const priceText = p.isRental
              ? `${(p.price / 1000).toFixed(0)}K บาท/เดือน`
              : `${(p.price / 1_000_000)?.toFixed(1) ?? '-'} ล้าน`
            return (
              <label
                key={p.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 ${checked ? 'bg-blue-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.id)}
                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                />
                <span className="flex-1 text-sm text-slate-800 truncate">{p.title || '-'}</span>
                <span className="text-xs text-slate-500 shrink-0">{priceText}</span>
              </label>
            )
          })
        )}
      </div>
      <p className="text-xs text-slate-500">เลือกแล้ว {selectedIds.length} รายการ</p>
    </div>
  )
}

function QueryFilterForm({ criteria, onChange, properties }) {
  const count = useMemo(() => filterPropertiesByCriteria(properties, criteria).length, [properties, criteria])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ราคาสูงสุด (บาท)</label>
          <input
            type="number"
            min="0"
            value={criteria.maxPrice ?? ''}
            onChange={(e) => onChange({ ...criteria, maxPrice: e.target.value ? Number(e.target.value) : null })}
            placeholder="เช่น 2000000"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ราคาต่ำสุด (บาท)</label>
          <input
            type="number"
            min="0"
            value={criteria.minPrice ?? ''}
            onChange={(e) => onChange({ ...criteria, minPrice: e.target.value ? Number(e.target.value) : null })}
            placeholder="เช่น 500000"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ทำเล (จังหวัด/อำเภอ)</label>
        <input
          type="text"
          value={criteria.location ?? ''}
          onChange={(e) => onChange({ ...criteria, location: e.target.value || null })}
          placeholder="เช่น อมตะ ชลบุรี"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ประเภททรัพย์</label>
        <select
          value={criteria.type ?? ''}
          onChange={(e) => onChange({ ...criteria, type: e.target.value || null })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20"
        >
          <option value="">ทั้งหมด</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm font-medium text-yellow-900">
          จำนวนทรัพย์ที่จะแสดง: <span className="text-yellow-700">{count}</span> รายการ
        </p>
      </div>
    </div>
  )
}

export default function HomepageSectionsAdmin() {
  const [sections, setSections] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    targetTag: '',
    titleColor: 'text-blue-900',
    isHighlighted: false,
    isBlinking: false,
    type: 'manual',
    propertyIds: [],
    criteria: {},
  })

  useEffect(() => {
    const unsubS = getHomepageSectionsSnapshot(setSections)
    const unsubP = getPropertiesSnapshot(setProperties)
    setLoading(false)
    return () => {
      unsubS()
      unsubP()
    }
  }, [])

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(t)
    }
  }, [successMessage])

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(t)
    }
  }, [errorMessage])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event) => {
    setIsDragging(false)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sections.findIndex((s) => s.id === active.id)
    const newIdx = sections.findIndex((s) => s.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const newList = arrayMove(sections, oldIdx, newIdx)
    setSections(newList)
    try {
      const updates = newList.map((s, i) => ({ id: s.id, order: i }))
      await batchUpdateHomepageSectionOrders(updates)
      setSuccessMessage('สลับลำดับสำเร็จ')
    } catch (e) {
      setErrorMessage('เกิดข้อผิดพลาด: ' + e.message)
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      subtitle: '',
      targetTag: '',
      titleColor: 'text-blue-900',
      isHighlighted: false,
      isBlinking: false,
      type: 'manual',
      propertyIds: [],
      criteria: {},
    })
    setEditingSection(null)
    setShowForm(false)
  }

  const handleEdit = (section) => {
    setEditingSection(section)
    setForm({
      title: section.title || '',
      subtitle: section.subtitle || '',
      targetTag: section.targetTag || '',
      titleColor: section.titleColor || 'text-blue-900',
      isHighlighted: section.isHighlighted || false,
      isBlinking: section.isBlinking || false,
      type: section.type || 'manual',
      propertyIds: section.propertyIds || [],
      criteria: section.criteria || {},
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!form.title.trim()) {
      setErrorMessage('กรุณาระบุชื่อหัวข้อ')
      return
    }
    if (form.type === 'manual' && (!form.propertyIds || form.propertyIds.length === 0)) {
      setErrorMessage('กรุณาเลือกทรัพย์อย่างน้อย 1 รายการ')
      return
    }
    const targetTag = (form.targetTag || form.title || '').trim() // ใช้ title เป็น fallback
    const sectionTitle = form.title.trim() // ชื่อหัวข้อที่จะใช้เป็น tag
    const payload = {
      title: sectionTitle,
      subtitle: form.subtitle.trim(),
      targetTag: targetTag || null,
      titleColor: form.titleColor || 'text-blue-900',
      isHighlighted: form.isHighlighted || false,
      isBlinking: form.isBlinking || false,
      type: form.type,
      propertyIds: form.type === 'manual' ? form.propertyIds : [],
      criteria: form.type === 'query' ? form.criteria : {},
    }
    try {
      if (editingSection) {
        // Sync tags: compare old vs new propertyIds (manual type) - ใช้ชื่อหัวข้อเป็น tag
        if (form.type === 'manual' && sectionTitle) {
          const oldIds = editingSection.propertyIds || []
          const newIds = form.propertyIds || []
          const addedIds = newIds.filter((id) => !oldIds.includes(id))
          const removedIds = oldIds.filter((id) => !newIds.includes(id))
          const tagErrors = []
          
          // เพิ่ม tag (ชื่อหัวข้อ) ให้ทรัพย์ที่ถูกเพิ่ม
          for (const id of addedIds) {
            try {
              await addTagToProperty(id, sectionTitle)
            } catch (err) {
              console.error('addTagToProperty failed:', id, err)
              tagErrors.push(`เพิ่ม tag ให้ ${id}: ${err?.message || err}`)
            }
          }
          
          // ลบ tag (ชื่อหัวข้อเก่า) ออกจากทรัพย์ที่ถูกเอาออก
          // ถ้าชื่อหัวข้อเปลี่ยน ให้ลบชื่อเก่าออกด้วย
          const oldTitle = (editingSection.title || '').trim()
          for (const id of removedIds) {
            try {
              await removeTagFromProperty(id, oldTitle)
            } catch (err) {
              console.error('removeTagFromProperty failed:', id, err)
              tagErrors.push(`ลบ tag จาก ${id}: ${err?.message || err}`)
            }
          }
          
          // ถ้าชื่อหัวข้อเปลี่ยน ให้อัปเดต tag ในทรัพย์ที่ยังอยู่ใน section
          if (oldTitle && oldTitle !== sectionTitle && newIds.length > 0) {
            for (const id of newIds) {
              try {
                // ลบชื่อเก่า
                await removeTagFromProperty(id, oldTitle)
                // เพิ่มชื่อใหม่
                await addTagToProperty(id, sectionTitle)
              } catch (err) {
                console.error('updateTag failed:', id, err)
                tagErrors.push(`อัปเดต tag ให้ ${id}: ${err?.message || err}`)
              }
            }
          }
          
          if (tagErrors.length > 0) {
            setErrorMessage('Sync tag ไม่สมบูรณ์: ' + tagErrors.join('; '))
          }
        }
        await updateHomepageSectionById(editingSection.id, {
          ...payload,
          isActive: editingSection.isActive ?? true,
        })
        setSuccessMessage('อัปเดตหัวข้อสำเร็จ')
      } else {
        // Create: add tag (ชื่อหัวข้อ) to all selected properties (manual type)
        if (form.type === 'manual' && sectionTitle) {
          const newIds = form.propertyIds || []
          const tagErrors = []
          for (const id of newIds) {
            try {
              await addTagToProperty(id, sectionTitle)
            } catch (err) {
              console.error('addTagToProperty failed:', id, err)
              tagErrors.push(`เพิ่ม tag ให้ ${id}: ${err?.message || err}`)
            }
          }
          if (tagErrors.length > 0) {
            setErrorMessage('Sync tag ไม่สมบูรณ์: ' + tagErrors.join('; '))
          }
        }
        const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order ?? 0)) + 1 : 0
        await createHomepageSection({ ...payload, order: maxOrder, isActive: true })
        setSuccessMessage('เพิ่มหัวข้อสำเร็จ')
      }
      resetForm()
    } catch (err) {
      setErrorMessage('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบหัวข้อนี้หรือไม่?')) return
    setDeletingId(id)
    setErrorMessage(null)
    try {
      const section = sections.find((s) => s.id === id)
      // ลบ tag (ชื่อหัวข้อ) ออกจากทรัพย์ทั้งหมดใน section นี้ (ถ้าเป็น manual type)
      if (section && section.type === 'manual' && section.title) {
        const sectionTitle = (section.title || '').trim()
        const propertyIds = section.propertyIds || []
        const tagErrors = []
        for (const propertyId of propertyIds) {
          try {
            await removeTagFromProperty(propertyId, sectionTitle)
          } catch (err) {
            console.error('removeTagFromProperty failed:', propertyId, err)
            tagErrors.push(`ลบ tag จาก ${propertyId}: ${err?.message || err}`)
          }
        }
        if (tagErrors.length > 0) {
          setErrorMessage('ลบหัวข้อแล้ว แต่ sync tag ไม่สมบูรณ์: ' + tagErrors.join('; '))
        }
      }
      await deleteHomepageSectionById(id)
      setSuccessMessage('ลบหัวข้อสำเร็จ')
    } catch (e) {
      setErrorMessage('เกิดข้อผิดพลาด: ' + e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (id, isActive) => {
    try {
      await updateHomepageSectionById(id, { isActive })
      setSuccessMessage(isActive ? 'เปิดใช้งานสำเร็จ' : 'ปิดใช้งานสำเร็จ')
    } catch (e) {
      setErrorMessage('เกิดข้อผิดพลาด: ' + e.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">จัดการหัวข้อหน้าแรก</h1>
          <p className="text-slate-600">จัดลำดับและจัดการ Section แสดงสินค้าในหน้าแรก (เช่น ทรัพย์เด่น)</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          disabled={showForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          เพิ่มหัวข้อ
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 flex-1">{errorMessage}</p>
          <button type="button" onClick={() => setErrorMessage(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-600">กำลังโหลด...</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section, idx) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  index={idx}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  isDeleting={deletingId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {sections.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <LayoutList className="h-16 w-16 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 mb-2">ยังไม่มีหัวข้อ</p>
          <p className="text-sm text-slate-500 mb-4">กด &quot;เพิ่มหัวข้อ&quot; เพื่อสร้าง Section แรก</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition"
          >
            เพิ่มหัวข้อ
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-4">{editingSection ? 'แก้ไขหัวข้อ' : 'เพิ่มหัวข้อใหม่'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อหัวข้อ *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="เช่น ผ่อนตรงเจ้าของ ไม่เช็คเครดิตบูโร"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    <strong>หมายเหตุ:</strong> ชื่อหัวข้อนี้จะถูกใช้เป็น <strong>Tag</strong> อัตโนมัติสำหรับทรัพย์ที่เลือกในหัวข้อนี้
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">คำโปรย</label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    placeholder="คำอธิบายสั้นๆ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tag สำหรับ Filter (ปุ่มดูทั้งหมด) - ไม่บังคับ</label>
                  <input
                    type="text"
                    value={form.targetTag}
                    onChange={(e) => setForm((f) => ({ ...f, targetTag: e.target.value }))}
                    placeholder="ถ้าไม่กรอกจะใช้ชื่อหัวข้อแทน"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Tag สำหรับปุ่ม &quot;ดูทั้งหมด&quot; (ถ้าไม่กรอกจะใช้ชื่อหัวข้อแทน)
                  </p>
                </div>
                
                {/* Style Customization */}
                <div className="border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-3">ปรับแต่งสไตล์ชื่อหัวข้อ</label>
                  
                  {/* Color Picker */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-600 mb-2">สีของชื่อหัวข้อ</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'น้ำเงิน (มาตรฐาน)', value: 'text-blue-900', bg: 'bg-blue-900' },
                        { label: 'แดง (Hot Deal)', value: 'text-red-600', bg: 'bg-red-600' },
                        { label: 'ทอง (Premium)', value: 'text-yellow-600', bg: 'bg-yellow-600' },
                        { label: 'เขียว (New)', value: 'text-emerald-600', bg: 'bg-emerald-600' },
                        { label: 'ม่วง (Special)', value: 'text-purple-600', bg: 'bg-purple-600' },
                        { label: 'ส้ม (Featured)', value: 'text-orange-600', bg: 'bg-orange-600' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, titleColor: opt.value }))}
                          className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                            opt.bg
                          } ${
                            form.titleColor === opt.value
                              ? 'border-slate-900 scale-110 shadow-lg ring-2 ring-slate-300'
                              : 'border-transparent hover:scale-105 hover:shadow-md'
                          }`}
                          title={opt.label}
                        >
                          {form.titleColor === opt.value && (
                            <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">เลือกสีที่ต้องการสำหรับชื่อหัวข้อ</p>
                  </div>

                  {/* Highlight Toggle */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isHighlighted}
                        onChange={(e) => setForm((f) => ({ ...f, isHighlighted: e.target.checked }))}
                        className="w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
                      />
                      <span className="text-sm font-medium text-slate-700">ทำให้หัวข้อเด่นเป็นพิเศษ</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    เมื่อเปิดใช้งาน จะแสดงเอฟเฟกต์พิเศษ เช่น Gradient หรือเส้นใต้หนาๆ
                  </p>

                  {/* Blinking Toggle */}
                  <div className="flex items-center gap-3 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isBlinking}
                        onChange={(e) => setForm((f) => ({ ...f, isBlinking: e.target.checked }))}
                        className="w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
                      />
                      <span className="text-sm font-medium text-slate-700">ทำให้หัวข้อกระพริบ (Pulse)</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    เมื่อเปิดใช้งาน ชื่อหัวข้อจะกระพริบอย่างนุ่มนวลเพื่อดึงดูดความสนใจ
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทการดึงข้อมูล</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="manual"
                        checked={form.type === 'manual'}
                        onChange={() => setForm((f) => ({ ...f, type: 'manual', criteria: {} }))}
                        className="text-blue-900"
                      />
                      <span>เลือกเอง</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="query"
                        checked={form.type === 'query'}
                        onChange={() => setForm((f) => ({ ...f, type: 'query', propertyIds: [] }))}
                        className="text-blue-900"
                      />
                      <span>ดึงอัตโนมัติ</span>
                    </label>
                  </div>
                </div>

                {form.type === 'manual' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">เลือกทรัพย์ *</label>
                    <PropertySelector
                      properties={properties}
                      selectedIds={form.propertyIds}
                      onChange={(ids) => setForm((f) => ({ ...f, propertyIds: ids }))}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      <strong>💡 สิ่งที่จะเกิดขึ้นเมื่อบันทึก:</strong><br />
                      • ทรัพย์ที่ถูกเลือก → จะเพิ่ม <strong>ชื่อหัวข้อ</strong> เข้าไปใน customTags อัตโนมัติ<br />
                      • ทรัพย์ที่ถูกติ๊กออก → จะลบ <strong>ชื่อหัวข้อ</strong> ออกจาก customTags อัตโนมัติ<br />
                      • เมื่อลบหัวข้อ → จะลบ <strong>ชื่อหัวข้อ</strong> ออกจาก customTags ของทรัพย์ทั้งหมดในหัวข้อนี้
                    </p>
                  </div>
                )}

                {form.type === 'query' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">เงื่อนไขการดึงข้อมูล</label>
                    <QueryFilterForm
                      criteria={form.criteria}
                      onChange={(c) => setForm((f) => ({ ...f, criteria: c }))}
                      properties={properties}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-medium"
                  >
                    {editingSection ? 'บันทึก' : 'เพิ่ม'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
