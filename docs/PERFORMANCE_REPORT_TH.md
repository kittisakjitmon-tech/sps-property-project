# รายงานการปรับปรุงประสิทธิภาพ Lighthouse Mobile

## เป้าหมาย
- **LCP** < 2 วินาที  
- **FCP** < 1.5 วินาที  
- **Speed Index** < 3 วินาที  
- **คะแนน Lighthouse Mobile** > 90  

---

## 1. รายการปัญหาประสิทธิภาพที่พบและที่แก้ไข

| # | ปัญหา | สถานะ | หมายเหตุ |
|---|--------|--------|----------|
| 1 | **LCP element เป็น background-image** ใน Hero Skeleton และ fallback ของ PageLayout ทำให้ preload ไม่ตรงกับ element ที่วัด LCP | แก้แล้ว | เปลี่ยนเป็น `<img>` พร้อม preload ขนาด 800px, q=75 (~&lt;150KB) |
| 2 | **รูป Hero ขนาดใหญ่เกิน** (1280px) โหลดช้าบนมือถือ | แก้แล้ว | ใช้ w=800&q=75 ใน preload และ DEFAULT_IMAGE |
| 3 | **Firebase ถูก initialize ซ้ำ** เมื่อ HMR หรือ import ซ้ำ | แก้แล้ว | ใช้ `getApps()` เช็คก่อนสร้าง app ใหม่ |
| 4 | **Dependency ที่ไม่ใช้** ใน package.json | แก้แล้ว | ลบ `"npm": "^11.10.1"` |
| 5 | **รูป below-the-fold โหลดพร้อม above-the-fold** | แก้แล้ว | เพิ่ม `loading="lazy"` และ `decoding="async"` ใน ImageSlider, SharePage thumbnails, PropertyShareModal, Footer logo |
| 6 | รูปใน PropertyCard, PropertyDetail, BlogDetail, Home, Blogs | มีอยู่แล้ว | มี lazy/decoding อยู่แล้ว |

---

## 2. ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|------------------|
| `index.html` | Preload hero เป็น w=800&q=75 (ให้ตรงกับ LCP และลดขนาด) |
| `src/components/HeroSlider.jsx` | DEFAULT_IMAGE เป็น 800w; HeroSkeleton ใช้ `<img>` แทน background-image; กำหนด HERO_WIDTH/HEIGHT 800x450 |
| `src/components/PageLayout.jsx` | Fallback ของ Hero ใช้ `<img>` แทน background-image (URL 800w) |
| `src/lib/firebase.js` | ใช้ `getOrCreateApp()` ด้วย `getApps().find(app => app.name === name)` เพื่อไม่ init ซ้ำ |
| `package.json` | ลบ dependency `npm` |
| `src/components/ImageSlider.jsx` | รูป default และรูปสไลด์เพิ่ม `loading="lazy"`, `decoding="async"`, width/height |
| `src/pages/SharePage.jsx` | รูป thumbnails ในแกลเลอรีเพิ่ม `loading="lazy"`, `decoding="async"` |
| `src/components/PropertyShareModal.jsx` | รูป mainImage เพิ่ม `loading="lazy"`, `decoding="async"` |
| `src/components/Footer.jsx` | รูป logo เพิ่ม `loading="lazy"`, `decoding="async"` |

---

## 3. Code Snippets ที่ใช้

### 3.1 Preload LCP (index.html)
```html
<link rel="preload" as="image" href="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&amp;q=75&amp;auto=format" />
```

### 3.2 HeroSkeleton ใช้ &lt;img&gt; (HeroSlider.jsx)
```jsx
function HeroSkeleton({ children }) {
  return (
    <section className="relative flex items-center justify-center min-h-[85vh] overflow-hidden">
      <img
        src={DEFAULT_IMAGE}
        alt=""
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75 z-[1]" />
      <div className="relative z-[2] w-full flex flex-col ...">
        {children}
      </div>
    </section>
  )
}
```

### 3.3 Firebase init แบบไม่ซ้ำ (firebase.js)
```js
import { initializeApp, getApps } from 'firebase/app'
// ...

function getOrCreateApp(name, config) {
  const existing = getApps().find((app) => app.name === name)
  return existing || initializeApp(config, name)
}

export const publicApp = getOrCreateApp('publicApp', firebaseConfig)
export const adminApp = getOrCreateApp('adminApp', firebaseConfig)
```

### 3.4 รูป below-the-fold (ตัวอย่าง ImageSlider)
```jsx
<img
  src={img}
  alt={`Slide ${index + 1}`}
  width={400}
  height={300}
  loading="lazy"
  decoding="async"
  draggable={false}
  className="..."
/>
```

---

## 4. การประมาณการปรับปรุง Lighthouse

| เมตริก | ก่อน (ประมาณ) | หลัง (ประมาณ) | หมายเหตุ |
|--------|----------------|----------------|----------|
| **LCP** | 2.5–4 s | **&lt; 2 s** | Preload ตรงกับ LCP element; รูปเล็กลง (800w); ใช้ &lt;img&gt; |
| **FCP** | 1.5–2.5 s | **&lt; 1.5 s** | ลดงาน JS (ลบ npm, Firebase ไม่ init ซ้ำ); รูป hero โหลดเร็วขึ้น |
| **Speed Index** | 3–5 s | **&lt; 3 s** | Lazy load รูป below-the-fold; bundle เล็กลงเล็กน้อย |
| **Lighthouse Mobile** | 70–85 | **90+** | LCP/FCP/SI ดีขึ้น; TBT ลดจาก lazy load และการโหลดที่เหมาะสม |

- **หมายเหตุ:** ตัวเลข “ก่อน” เป็นการประมาณจากพฤติกรรมทั่วไปของ hero แบบ background-image และการโหลดรูปขนาดใหญ่ การวัดจริงควรรัน Lighthouse บนโหมด Mobile ก่อน/หลังแก้ไขในสภาพแวดล้อมเดียวกัน (เช่น DevTools throttling หรือ WebPageTest) เพื่อเปรียบเทียบ

---

## 5. สิ่งที่ทำไปแล้วตามข้อกำหนด (สรุป)

1. **LCP:** กำหนด LCP เป็น hero; ใช้ `<img>` + preload ขนาด 800w, q=75 (~&lt;150KB); HeroSkeleton และ fallback ใช้ `<img>`  
2. **รูปภาพ:** รูป hero ใช้ Unsplash auto=format (รองรับ WebP ตาม browser); รูป below-the-fold เพิ่ม `loading="lazy"` และ `decoding="async"`  
3. **Code splitting:** มีการใช้ `React.lazy` + `Suspense` สำหรับ HeroSlider และ Footer อยู่แล้ว  
4. **Firebase:** กันการ init ซ้ำด้วย `getApps()`  
5. **Bundle:** ลบ dependency ที่ไม่ใช้ (`npm`)  
6. **ไม่ทำลายฟังก์ชันเดิม:** ไม่เปลี่ยนพฤติกรรม UI หรือการแสดงผล แค่เปลี่ยนวิธีโหลดรูปและ init Firebase  

---

## 6. แนะนำขั้นตอนถัดไป (ถ้าต้องการคะแนนสูงขึ้นอีก)

- วิเคราะห์ bundle ด้วย `vite-bundle-visualizer` หรือ `rollup-plugin-visualizer` เพื่อหา chunk ใหญ่และพิจารณา dynamic import  
- ตรวจสอบ font: ใช้ `font-display: swap` และ preconnect ไปยัง fonts.gstatic.com (ถ้ามีใช้ Google Fonts)  
- ลดหรือจำกัดผลกระทบของ `blur` / `shadow-xl` บนมือถือ (เช่น ใช้ class ที่เบาลงใน media query)  
- พิจารณาใช้ AVIF สำหรับรูปสำคัญเมื่อ browser รองรับ  
