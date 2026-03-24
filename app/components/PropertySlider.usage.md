# PropertySlider Component - Documentation

## ภาพรวม

`PropertySlider` เป็น component สำหรับแสดงรายการทรัพย์สินในรูปแบบ **Horizontal Slider** พร้อมปุ่มเลื่อนซ้าย-ขวาสำหรับ Desktop และรองรับการ Swipe บน Mobile

---

## Features

✅ **Horizontal Scrolling** - เลื่อนแนวนอนแบบ Smooth  
✅ **Navigation Arrows** - ปุ่มซ้าย/ขวาสำหรับ Desktop (แสดงเมื่อ Hover)  
✅ **Scroll Snap** - การ์ดแต่ละใบจะ Snap ให้ตรงเมื่อเลื่อน  
✅ **Hidden Scrollbar** - ซ่อน Scrollbar เพื่อความสวยงาม  
✅ **Responsive** - ปรับขนาดการ์ดตามขนาดหน้าจอ  
✅ **Touch-friendly** - รองรับการ Swipe บน Mobile/Tablet  
✅ **Keyboard Accessible** - ปุ่ม Focus และ ARIA labels  

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `properties` | Array | `[]` | รายการทรัพย์สิน (array of property objects) |
| `featuredLabel` | String | `'แนะนำ'` | Label แสดงบนการ์ดทรัพย์สิน |

---

## การใช้งาน

### 1. Basic Usage - ใน Homepage Section

```jsx
import PropertySlider from '../components/PropertySlider'

function HomePage() {
  const [featuredProperties, setFeaturedProperties] = useState([])

  return (
    <section className="py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">ทรัพย์เด่น</h2>
        <PropertySlider 
          properties={featuredProperties} 
          featuredLabel="แนะนำ" 
        />
      </div>
    </section>
  )
}
```

---

### 2. Hot Deal Section

```jsx
import PropertySlider from '../components/PropertySlider'

function HotDealsSection() {
  const hotDeals = properties.filter(p => p.hotDeal === true)

  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">🔥 Hot Deal</h2>
            <p className="text-slate-600 text-sm">ดีลพิเศษที่คุณห้ามพลาด</p>
          </div>
          <Link to="/properties?hotDeal=true" className="text-blue-600 hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
        <PropertySlider 
          properties={hotDeals} 
          featuredLabel="Hot Deal" 
        />
      </div>
    </section>
  )
}
```

---

### 3. Integration with DynamicPropertySection (Already Implemented)

```jsx
import PropertySlider from './PropertySlider'

export default function DynamicPropertySection({ title, subtitle, properties }) {
  if (!properties || properties.length === 0) return null

  return (
    <section className="py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">{title}</h2>
            {subtitle && <p className="text-slate-600 text-sm">{subtitle}</p>}
          </div>
          <Link to="/properties" className="text-blue-900 hover:underline">
            ดูทั้งหมด
          </Link>
        </div>
        <PropertySlider properties={properties} featuredLabel="แนะนำ" />
      </div>
    </section>
  )
}
```

---

### 4. Multiple Sliders in One Page

```jsx
function PropertyListingsPage() {
  const [newListings, setNewListings] = useState([])
  const [popularListings, setPopularListings] = useState([])
  const [luxuryHomes, setLuxuryHomes] = useState([])

  return (
    <div className="space-y-12">
      {/* New Listings */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">ประกาศใหม่</h2>
          <PropertySlider properties={newListings} featuredLabel="ใหม่" />
        </div>
      </section>

      {/* Popular */}
      <section className="py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">ยอดนิยม</h2>
          <PropertySlider properties={popularListings} featuredLabel="ยอดนิยม" />
        </div>
      </section>

      {/* Luxury */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">บ้านหรู</h2>
          <PropertySlider properties={luxuryHomes} featuredLabel="Premium" />
        </div>
      </section>
    </div>
  )
}
```

---

## Technical Details

### Card Sizing (Responsive)

```jsx
// ใน PropertySlider component
<div className="snap-start shrink-0 w-[280px] sm:w-[300px] lg:w-[320px]">
  <PropertyCard property={property} featuredLabel={featuredLabel} />
</div>
```

- **Mobile:** `280px` width
- **Tablet (sm):** `300px` width
- **Desktop (lg):** `320px` width

### Scroll Behavior

```jsx
// Scroll by 340px (card width + gap)
containerRef.current.scrollBy({ left: 340, behavior: 'smooth' })
```

ปรับค่า `340` ตามขนาดการ์ด + gap ที่ต้องการ

---

## Styling Notes

### Container Classes

```jsx
className="flex flex-row flex-nowrap gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
```

- `flex-row flex-nowrap` - แถวเดียวไม่ขึ้นบรรทัดใหม่
- `gap-4 sm:gap-5` - ระยะห่างระหว่างการ์ด
- `overflow-x-auto` - เลื่อนแนวนอนได้
- `snap-x snap-mandatory` - Scroll snap แนวนอน
- `scroll-smooth` - Smooth scrolling
- `scrollbar-hide` - ซ่อน scrollbar (custom class)

### Arrow Button Classes

```jsx
className="hidden md:flex ... opacity-0 group-hover:opacity-100 ..."
```

- `hidden md:flex` - ซ่อนใน mobile, แสดงใน desktop
- `opacity-0 group-hover:opacity-100` - แสดงเมื่อ hover ที่ section
- `absolute ... -translate-x-1/2` - จัดตำแหน่งลอยซ้าย/ขวา
- `z-10` - อยู่เหนือการ์ด

---

## Customization

### เปลี่ยนขนาดการ์ด

```jsx
// แก้ที่ wrapper div
<div className="snap-start shrink-0 w-[250px] sm:w-[280px] lg:w-[300px]">
```

### เปลี่ยนระยะเลื่อน

```jsx
// แก้ใน scrollLeft/scrollRight functions
containerRef.current.scrollBy({ left: 300, behavior: 'smooth' })
```

### แสดงปุ่มตลอดเวลา (ไม่ต้องรอ hover)

```jsx
// เอา opacity-0 และ group-hover:opacity-100 ออก
className="hidden md:flex ... shadow-lg hover:shadow-xl ..."
```

### เปลี่ยนสีปุ่ม

```jsx
// เปลี่ยนจาก bg-white เป็นสีอื่น
className="... bg-blue-600 text-white ..."
```

---

## Browser Support

✅ Chrome/Edge (latest)  
✅ Firefox (latest)  
✅ Safari (latest)  
✅ Mobile Safari (iOS)  
✅ Chrome Mobile (Android)  

---

## Performance Tips

1. **Lazy Load Images** - PropertyCard ควรใช้ `loading="lazy"` สำหรับรูปภาพ
2. **Limit Items** - แสดงแค่ 8-12 รายการต่อ slider เพื่อประสิทธิภาพ
3. **Virtual Scrolling** - ถ้ามีรายการมากกว่า 20 ควรใช้ virtual scroll library

---

## Accessibility

- ✅ Keyboard navigation (Tab, Arrow keys)
- ✅ ARIA labels บนปุ่มลูกศร
- ✅ Focus states ชัดเจน
- ✅ Semantic HTML

---

## Common Issues & Solutions

### ปัญหา: ปุ่มลูกศรไม่แสดง
**สาเหตุ:** Section ไม่มี class `group`  
**แก้:** เพิ่ม `group` ที่ parent container ของ PropertySlider

### ปัญหา: การ์ดบีบตัว
**สาเหตุ:** ไม่มี `shrink-0`  
**แก้:** เพิ่ม `shrink-0` ที่ card wrapper

### ปัญหา: Scroll ไม่ Snap
**สาเหตุ:** ขาด `snap-start` หรือ `snap-x snap-mandatory`  
**แก้:** ตรวจสอบ classes ตาม documentation

---

## Migration Guide

### จาก Grid เป็น Slider

**Before:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {properties.map(p => <PropertyCard key={p.id} property={p} />)}
</div>
```

**After:**
```jsx
<PropertySlider properties={properties} featuredLabel="แนะนำ" />
```

---

## Future Enhancements

- [ ] Auto-scroll (carousel mode)
- [ ] Dots indicator (pagination)
- [ ] Touch swipe indicators
- [ ] Infinite scroll
- [ ] Keyboard arrow navigation
