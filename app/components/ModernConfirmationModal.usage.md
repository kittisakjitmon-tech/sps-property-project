# ModernConfirmationModal - Usage Examples

## ตัวอย่างการใช้งาน ModernConfirmationModal ใน React Component

### 1. Basic Usage - การลบทรัพย์สิน (Delete Property)

```jsx
import { useState } from 'react'
import ModernConfirmationModal from '../components/ModernConfirmationModal'

function PropertyList() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  const handleDeleteClick = (property) => {
    setItemToDelete(property)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    try {
      await deletePropertyById(itemToDelete.id)
      console.log('ลบสำเร็จ')
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <>
      {/* ปุ่มลบ */}
      <button onClick={() => handleDeleteClick(property)}>
        ลบทรัพย์สิน
      </button>

      {/* Modal */}
      <ModernConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบทรัพย์สิน"
        message={
          <>
            คุณต้องการลบ <span className="font-semibold">"{itemToDelete?.title}"</span> ใช่หรือไม่?
            <br />
            <span className="text-sm text-red-600 mt-2 block">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </span>
          </>
        }
        confirmText="ลบทรัพย์สิน"
        cancelText="ยกเลิก"
        isDanger={true}
        variant="delete"
      />
    </>
  )
}
```

---

### 2. Warning Variant - การเตือนก่อนทำงาน

```jsx
<ModernConfirmationModal
  isOpen={isWarningOpen}
  onClose={() => setIsWarningOpen(false)}
  onConfirm={handleProceed}
  title="คำเตือน"
  message="การเปลี่ยนแปลงนี้อาจส่งผลกระทบต่อระบบ คุณต้องการดำเนินการต่อหรือไม่?"
  confirmText="ดำเนินการต่อ"
  cancelText="ยกเลิก"
  isDanger={false}
  variant="warning"
/>
```

---

### 3. Simple Confirmation - ยืนยันการบันทึก

```jsx
<ModernConfirmationModal
  isOpen={isSaveModalOpen}
  onClose={() => setIsSaveModalOpen(false)}
  onConfirm={handleSave}
  title="บันทึกการเปลี่ยนแปลง?"
  message="คุณต้องการบันทึกการเปลี่ยนแปลงที่ทำไปหรือไม่?"
  confirmText="บันทึก"
  cancelText="ยกเลิก"
  isDanger={false}
  variant="warning"
/>
```

---

### 4. Multiple Items Delete - ลบหลายรายการ

```jsx
function BulkDeleteExample() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])

  const handleBulkDelete = () => {
    setIsDeleteModalOpen(true)
  }

  const handleConfirm = async () => {
    // ลบทีละรายการ
    for (const item of selectedItems) {
      await deleteItem(item.id)
    }
    setSelectedItems([])
  }

  return (
    <>
      <button onClick={handleBulkDelete}>
        ลบที่เลือก ({selectedItems.length})
      </button>

      <ModernConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirm}
        title="ยืนยันการลบหลายรายการ"
        message={
          <div className="space-y-2">
            <p>คุณกำลังจะลบ <strong>{selectedItems.length}</strong> รายการ:</p>
            <ul className="text-left text-sm space-y-1 max-h-32 overflow-y-auto">
              {selectedItems.slice(0, 5).map((item) => (
                <li key={item.id} className="text-gray-600">• {item.title}</li>
              ))}
              {selectedItems.length > 5 && (
                <li className="text-gray-500">... และอีก {selectedItems.length - 5} รายการ</li>
              )}
            </ul>
            <p className="text-red-600 text-sm mt-3">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
          </div>
        }
        confirmText={`ลบทั้งหมด (${selectedItems.length})`}
        cancelText="ยกเลิก"
        isDanger={true}
        variant="delete"
      />
    </>
  )
}
```

---

### 5. Custom Hook Pattern - สำหรับใช้ซ้ำหลายที่

```jsx
// useConfirmationModal.js
import { useState } from 'react'

export function useConfirmationModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({})
  const [resolveCallback, setResolveCallback] = useState(null)

  const confirm = (options) => {
    return new Promise((resolve) => {
      setConfig(options)
      setResolveCallback(() => resolve)
      setIsOpen(true)
    })
  }

  const handleConfirm = () => {
    resolveCallback?.(true)
    setIsOpen(false)
  }

  const handleCancel = () => {
    resolveCallback?.(false)
    setIsOpen(false)
  }

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
  }
}

// ใน Component
function MyComponent() {
  const modal = useConfirmationModal()

  const handleDelete = async (item) => {
    const confirmed = await modal.confirm({
      title: 'ยืนยันการลบ',
      message: `ต้องการลบ "${item.title}" ใช่หรือไม่?`,
      confirmText: 'ลบ',
      isDanger: true,
    })

    if (confirmed) {
      await deleteItem(item.id)
    }
  }

  return (
    <>
      <button onClick={() => handleDelete(item)}>ลบ</button>

      <ModernConfirmationModal
        isOpen={modal.isOpen}
        onClose={modal.handleCancel}
        onConfirm={modal.handleConfirm}
        title={modal.config.title}
        message={modal.config.message}
        confirmText={modal.config.confirmText}
        isDanger={modal.config.isDanger}
      />
    </>
  )
}
```

---

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | `false` | ควบคุมการแสดงผล Modal |
| `onClose` | function | - | ฟังก์ชันเมื่อปิด Modal (กดปุ่มยกเลิก, ESC, หรือคลิก Overlay) |
| `onConfirm` | function | - | ฟังก์ชันเมื่อกดปุ่มยืนยัน |
| `title` | string | `'ยืนยันการดำเนินการ'` | หัวข้อ Modal |
| `message` | string\|ReactNode | `'คุณแน่ใจหรือไม่...'` | ข้อความยืนยัน (รองรับ JSX) |
| `confirmText` | string | `'ลบ'` | ข้อความปุ่มยืนยัน |
| `cancelText` | string | `'ยกเลิก'` | ข้อความปุ่มยกเลิก |
| `isDanger` | boolean | `true` | ถ้า `true` ปุ่มยืนยันเป็นสีแดง, ถ้า `false` เป็นสีน้ำเงิน |
| `variant` | `'delete'` \| `'warning'` | `'delete'` | รูปแบบไอคอน: ถังขยะหรือเครื่องหมายเตือน |

---

## Features

✅ **Animation นุ่มนวล** - Fade in + Scale up  
✅ **Keyboard Support** - กด ESC เพื่อปิด Modal  
✅ **Click Outside** - คลิกที่ Overlay เพื่อปิด  
✅ **Body Scroll Lock** - ป้องกันการ scroll พื้นหลังเมื่อเปิด Modal  
✅ **Responsive Design** - รองรับทุกขนาดหน้าจอ  
✅ **Accessible** - มี aria-label และ focus management  
✅ **Customizable** - รองรับ JSX ใน message prop  

---

## Styling Notes

- ใช้ Tailwind CSS สำหรับ styling
- สี: Red (danger), Blue (primary), Gray (neutral)
- ไอคอนจาก `lucide-react`: `Trash2`, `AlertTriangle`, `X`
- Animation: CSS keyframes สำหรับ fade/scale effects
