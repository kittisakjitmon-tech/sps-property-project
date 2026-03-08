# แผนการเพิ่มการเรียงตามราคา (Sort by Price) ในตัวกรองเพิ่มเติม

## วัตถุประสงค์
เพิ่มตัวเลือก **เรียงตาม** ในพาเนล "ตัวกรองเพิ่มเติม" ของหน้า Properties เพื่อให้ผู้ใช้เรียงรายการได้ เช่น ราคาต่ำ→สูง, ราคาสูง→ต่ำ, ใหม่ล่าสุด และให้ค่าที่เลือก sync กับ URL เพื่อแชร์ลิงค์/รีเฟรชได้

---

## สถานะปัจจุบัน

- **หน้า Properties** ([src/pages/Properties.jsx](src/pages/Properties.jsx))
  - ดึงข้อมูล: `getPropertiesOnceForListing(true, 300)` (เรียงจาก Firestore เป็น `createdAt` desc อยู่แล้ว)
  - กรอง: `filterProperties(properties, searchFilters)` → `filtered`
  - ไม่มีการ sort เพิ่มหลังกรอง: ใช้ `safeFiltered = filtered` แล้ว slice แบบ pagination
- **ตัวกรองเพิ่มเติม** ([src/components/AdvancedFiltersPanel.jsx](src/components/AdvancedFiltersPanel.jsx))
  - มีเฉพาะ: ราคา (min/max), พื้นที่, ห้องนอน, ห้องน้ำ
  - ยังไม่มีช่อง "เรียงตาม"
- **URL**
  - อ่านจาก `searchParams` (location, priceMin, priceMax, ฯลฯ) แล้ว sync ไปยัง `filters` ผ่าน `updateFilters` ใน useEffect
  - ไม่มีพารามิเตอร์ `sort` / `sortBy`

---

## Phase 0: ตรวจสอบก่อนเริ่ม

### 0.1 Checklist ก่อนแก้
- [ ] เปิด `/properties` โหลดได้ แสดงบัตรรายการ
- [ ] ตัวกรองเพิ่มเติม (ราคา, ห้องนอน, ฯลฯ) ทำงาน นำค่ากรองแล้วจำนวนผลลัพธ์เปลี่ยน
- [ ] Pagination ทำงาน (หน้า 2, URL `?page=2`)
- [ ] แผนที่แสดง pin ตามผลกรอง

### 0.2 จุดที่อาจกระทบ
- [src/components/AdvancedFiltersPanel.jsx](src/components/AdvancedFiltersPanel.jsx) — เพิ่ม UI เรียงตาม + รีเซ็ตใน "ล้างทั้งหมด"
- [src/pages/Properties.jsx](src/pages/Properties.jsx) — อ่าน `sort` จาก URL, คำนวณ `sortedFiltered`, sync `sort` ลง URL เมื่อเปลี่ยน
- [src/context/SearchContext.jsx](src/context/SearchContext.jsx) — (ถ้าต้องการให้ sort อยู่ใน filters) เพิ่ม `sortBy` ใน `INITIAL_FILTERS`; ไม่บังคับถ้าใช้แค่จาก URL ใน Properties

---

## Phase 1: การออกแบบและดำเนินการ

### 1.1 ค่าที่รองรับสำหรับการเรียง (Sort options)

| ค่า (value)   | แสดงใน UI        | Logic การเรียง |
|---------------|------------------|--------------------------------|
| `''`          | ไม่เรียง / ล่าสุด | ใช้ลำดับเดิม (จาก Firestore = ใหม่ล่าสุดมาก่อน) |
| `newest`      | ใหม่ล่าสุด       | เรียง `createdAt` desc (เหมือนค่าเริ่มต้น) |
| `price_asc`   | ราคาต่ำ - สูง    | เรียง `price` (หรือ field ราคาที่ใช้) จากน้อยไปมาก |
| `price_desc`  | ราคาสูง - ต่ำ    | เรียง `price` จากมากไปน้อย |

- ฟิลด์ราคาที่ใช้: `property.price` (number) — ถ้าไม่มีให้ถือเป็น 0 หรือไม่นำไปเปรียบเทียบ (อยู่ท้าย)
- ฟิลด์วันที่: `property.createdAt` (Timestamp หรือ number) — ใช้ `.toMillis?.()` ถ้าเป็น Firestore Timestamp

### 1.2 ไฟล์และงานที่ต้องทำ

#### A. AdvancedFiltersPanel.jsx
- เพิ่มส่วน **เรียงตาม** ในพาเนล (ด้านบนหรือใต้บล็อกราคา):
  - ป้ายกำกับ: "เรียงตาม"
  - รูปแบบ: dropdown / select หรือปุ่มเลือกตัวเลือก
  - ตัวเลือก: ไม่เรียง, ใหม่ล่าสุด, ราคาต่ำ-สูง, ราคาสูง-ต่ำ
- เมื่อเลือกค่า: เรียก `onUpdateFilters({ sortBy: value })`
- ใน **ล้างทั้งหมด** (`handleClearAdvancedFilters`): เพิ่ม `sortBy: ''` เพื่อให้รีเซ็ตการเรียง
- นับ **active advanced filters**: รวม `sortBy` (ถ้าไม่ใช่ `''` / `newest`) เป็น 1 ตัวนับหรือตามที่ทีมกำหนด

#### B. Properties.jsx
1. **อ่าน sort จาก URL และใส่ใน filters**
   - ใน `useEffect` ที่อ่าน `searchParams` แล้วเรียก `updateFilters({ ... })` ให้เพิ่ม:
     - `sortBy: searchParams.get('sort') ?? ''` (หรือใช้ `'newest'` เป็นค่า default ก็ได้)
2. **คำนวณรายการหลังเรียง**
   - หลัง `safeFiltered` สร้าง `sortedFiltered` ด้วย `useMemo`:
     - อินพุต: `safeFiltered`, `sortBy` (จาก `filters.sortBy || searchParams.get('sort') || ''`)
     - Logic: คัดลอกอาร์เรย์แล้ว `.sort()` ตาม `sortBy` (เปรียบเทียบ price, createdAt)
     - คืนค่า: อาร์เรย์ที่เรียงแล้ว
   - ใช้ **sortedFiltered** แทน safeFiltered ใน:
     - การคำนวณ `totalPages` และ `paginatedProperties`
     - การส่งให้แผนที่ (`mapProperties` คำนวณจาก `sortedFiltered` แทน `safeFiltered`) เพื่อให้ลำดับ pin ตรงกับรายการบัตร
3. **Sync sort ลง URL**
   - เมื่อผู้ใช้เปลี่ยนการเรียง (ผ่าน AdvancedFiltersPanel ที่เรียก `updateFilters({ sortBy })`) ต้องอัปเดต URL ด้วย
   - วิธีที่สอดคล้องกับโค้ดเดิม: ใน Properties มี `useEffect` ที่ watch `filters` (หรือเฉพาะ `filters.sortBy`) แล้ว `navigate('/properties?' + new URLSearchParams({ ...searchParams, sort: filters.sortBy || '' }), { replace: true })` และลบ `sort` ออกถ้าเป็นค่าว่าง หรือ
   - ทางเลือก: ให้ AdvancedFiltersPanel รับ `onApply` ที่หน้า Properties ส่งเป็นฟังก์ชันที่ทั้งอัปเดต URL (set searchParams หรือ navigate พร้อม params ปัจจุบัน + sort) และเรียก handlePageChange(1)
4. **Reset หน้าเมื่อเปลี่ยนการเรียง**
   - เมื่อ `sortBy` เปลี่ยน ควรกลับไปหน้า 1 (เช่น เรียก `handlePageChange(1)` หรือ set params ให้ `page=1`)

#### C. SearchContext.jsx (ตัวเลือก)
- ถ้าต้องการให้ `sortBy` อยู่ใน state ของ Search เหมือน filter อื่น:
  - เพิ่มใน `INITIAL_FILTERS`: `sortBy: ''`
  - ใน `clearFilters` รีเซ็ต `sortBy: ''`
- ถ้าไม่เพิ่ม ก็ใช้แค่การอ่าน/เขียนจาก URL ใน Properties และส่ง `filters.sortBy` จากการ merge กับ searchParams ใน Properties ก็ได้

### 1.3 Helper การเรียง (ใน Properties.jsx หรือแยกไฟล์)
```js
function sortPropertyList(list, sortBy) {
  if (!sortBy || sortBy === 'newest' || sortBy === '') {
    return [...list] // ลำดับเดิม (หรือเรียง createdAt desc ถ้าต้องการยืนยัน)
  }
  const arr = [...list]
  if (sortBy === 'price_asc') {
    arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
  } else if (sortBy === 'price_desc') {
    arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
  } else if (sortBy === 'newest') {
    arr.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
      const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
      return tb - ta
    })
  }
  return arr
}
```

### 1.4 URL พารามิเตอร์
- ชื่อพารามิเตอร์: **`sort`**
- ค่าที่อนุญาต: `''` (ไม่ส่งหรือลบออก), `newest`, `price_asc`, `price_desc`
- ตัวอย่าง: `/properties?sort=price_asc`, `/properties?page=2&sort=price_desc`

---

## Phase 2: ตรวจสอบหลังเสร็จ

### 2.1 Checklist หลังแก้
- [ ] เปิด `/properties` แล้วเลือก "เรียงตาม: ราคาต่ำ-สูง" รายการเรียงถูกต้อง และ URL มี `?sort=price_asc`
- [ ] เลือก "ราคาสูง-ต่ำ" รายการเรียงถูกต้อง และ URL มี `?sort=price_desc`
- [ ] กด "ล้างทั้งหมด" ในตัวกรองเพิ่มเติม แล้วการเรียงกลับเป็นค่าเริ่มต้น และ `sort` หายจาก URL (หรือเป็น default)
- [ ] รีเฟรชที่ `/properties?sort=price_asc` ยังได้ผลเรียงราคาต่ำ→สูง
- [ ] Pagination ยังทำงาน (หน้า 2 ยังเรียงตามตัวเลือกเดิม)
- [ ] แผนที่ยังแสดง pin ตามผลกรอง และลำดับสอดคล้องกับรายการ (ถ้าใช้ sortedFiltered สำหรับ map)

### 2.2 Regression
- [ ] ตัวกรองอื่น (ราคา min/max, ห้องนอน, ทำเล, ฯลฯ) ยังทำงานเหมือนเดิม
- [ ] หน้า Home, Favorites, Admin ไม่ได้รับผลกระทบ (ไม่ได้ใช้ sort ใน Properties)

---

## สรุปลำดับงาน

1. ทำ Phase 0 (รัน checklist ก่อนแก้)
2. เพิ่ม `sortBy` ใน SearchContext (ถ้าต้องการ) และใน URL sync ของ Properties
3. แก้ AdvancedFiltersPanel: เพิ่ม UI เรียงตาม + ล้าง sort ใน "ล้างทั้งหมด"
4. ใน Properties: อ่าน `sort` จาก URL → filters, สร้าง `sortedFiltered`, ใช้กับ pagination และ map, sync `sort` ลง URL เมื่อเปลี่ยนการเรียง และ reset หน้า 1
5. รัน Phase 2 checklist และ regression

เมื่อทำครบและ checklist ผ่าน ถือว่าเพิ่มฟีเจอร์เรียงตามราคาในตัวกรองเพิ่มเติมสำเร็จ และไม่ทำลายกระบวนการเดิม
