# รายงานตรวจสอบ 3 หัวข้อ ก่อนดำเนินการ

## 1. หน้า Properties ยังไม่ได้เปลี่ยน Map เป็น Longdo

### สถานะในโค้ด
- **หน้า Properties** (`src/pages/Properties.jsx`) ใช้ `<PropertiesMap properties={safeFiltered} />` อยู่แล้ว (บรรทัด 531–534)
- **PropertiesMap** (`src/components/PropertiesMap.jsx`) ถูกเปลี่ยนไปใช้ Longdo แล้วทั้งหมด:
  - เรียก `loadLongdoMap()` จาก `src/lib/longdoMapLoader.js`
  - สร้าง `longdo.Map` และ `longdo.Marker` แทน Google Maps

### สาเหตุที่อาจทำให้ “ยังไม่เห็น Longdo”
1. **ไม่มี `VITE_LONGDO_MAP_KEY` ใน `.env`**  
   ถ้าไม่มี key โหลด Longdo ไม่ได้ → แสดงข้อความ "ไม่สามารถโหลดแผนที่ได้" (ไม่ใช่แผนที่ Google)
2. **แผนที่แสดงเฉพาะเมื่อมีผลค้นหา**  
   โค้ด: `{safeFiltered.length > 0 && ( <PropertiesMap ... /> )}`  
   ถ้า filter แล้วไม่มีรายการ แผนที่จะไม่ถูก render เลย
3. **Cache / Build เก่า**  
   ถ้าเคย build ไว้แล้วและยังรันจาก build เก่า อาจยังเป็นโค้ดเก่า ต้อง build ใหม่หรือรัน `npm run dev` ใหม่

### แผนดำเนินการ
- ตรวจสอบว่าใน `.env` มี `VITE_LONGDO_MAP_KEY` และ value ถูกต้อง
- ยืนยันว่าเมื่อมีผลค้นหา (safeFiltered.length > 0) แผนที่ Longdo โหลดได้และไม่มี error ใน console
- ถ้ายังมีปัญหา: เพิ่มข้อความ error / loading ให้ชัดเจน และตรวจว่า container ของแผนที่ (ref) ถูก mount จริงตอนโหลด Longdo

---

## 2. สถานที่ใกล้เคียงเปลี่ยนเป็น Longdo + หลังบ้าน Admin กด Update เหมือนเดิม

### สถานะปัจจุบัน
- **Service:** `src/services/nearbyPlacesService.js` ใช้ **Google Places API (New)** และ **Distance Matrix API**
- **Admin:** ใน `PropertyForm.jsx` มีปุ่ม “อัปเดตสถานที่ใกล้เคียง” เรียก `fetchAndCacheNearbyPlaces(property, { forceRefresh: true })` แล้วเขียนผลลง `property.nearbyPlaces` ผ่าน `updatePropertyById`

### Longdo ที่ใช้ได้
- Longdo มี **POI Service (Nearby)** แบบ REST:  
  `https://api.longdo.com/POIService/json/search?tag=...&lat=...&lon=...&span=...&key=...`
- พารามิเตอร์สำคัญ: `tag` (ประเภท เช่น hospital, school), `lat`, `lon`, `span` (รัศมี เช่น 20km), `limit`, `key`
- โควต้า: 100,000 service transactions ฟรีต่อเดือน (รวมกับแผนที่)

### แผนดำเนินการ
- สร้าง/ปรับ service ให้เรียก **Longdo POI search** แทน Google Places + Distance Matrix
- แมปประเภทสถานที่ให้ตรงกับของเดิม (โรงพยาบาล, ห้าง, โรงเรียน/มหาลัย, นิคมอุตสาหกรรม) ผ่าน `tag` ของ Longdo
- ระยะทาง: ใช้ **Haversine** (ระยะเส้นตรง) แทน Distance Matrix เพื่อไม่พึ่ง Google และลด cost
- รูปแบบผลที่เขียนลง Firestore: ให้ตรงกับของเดิม (`nearbyPlaces` + `nearbyPlacesMeta`) เพื่อให้ `NeighborhoodData.jsx` และหน้าอื่นใช้ได้เหมือนเดิม
- **Flow Admin:** ยังคงเหมือนเดิม — กดปุ่มอัปเดต → เรียกฟังก์ชันดึงสถานที่ใกล้เคียง (จาก Longdo) → อัปเดต property ใน Firestore (cache)

---

## 3. Login ระบบหลังบ้าน / หน้าบ้านไม่ได้

### โครงสร้างที่เกี่ยวข้อง
- **หลังบ้าน:** `src/admin/Login.jsx` → ใช้ `useAdminAuth().login` → `signInWithEmailAndPassword(adminAuth, email, password)`
- **หน้าบ้าน:** `src/pages/PublicLogin.jsx` → ใช้ `usePublicAuth().login` → `signInWithEmailAndPassword(publicAuth, email, password)`
- **Firebase:** `publicAuth` และ `adminAuth` มาจาก **คนละ app** (`publicApp` / `adminApp`) แต่ใช้ **config ชุดเดียวกัน** (project เดียวกัน) ดังนั้น user account เป็นชุดเดียวกัน

### สาเหตุที่อาจทำให้ Login ไม่ได้
1. **Config Firebase ไม่โหลดหรือผิด**
   - ต้องมีใน `.env`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
   - ถ้าตัวแปรไม่ขึ้นต้น `VITE_` หรือไม่มีใน `.env` → config จะเป็น `undefined` → Auth ใช้ไม่ได้

2. **Firebase Console – วิธี Sign-in**
   - ต้องเปิด **Email/Password** (และถ้าใช้อยู่ต้องเปิด “Email link” ถ้ามีใช้) ใน Authentication → Sign-in method

3. **Authorized domains**
   - ใน Firebase Console → Authentication → Settings → Authorized domains ต้องมีโดเมนที่รันแอป (เช่น `localhost`, `spspropertysolution.com`)

4. **บัญชีที่เป็น Agent (เฉพาะหลังบ้าน)**
   - ใน `AdminAuthContext.jsx` ถ้า user มี `role === 'agent'` จะถูก **signOut ทันที** และไม่ให้เข้า admin  
   → ถ้าใช้บัญชี agent ลองเข้าหลังบ้านจะดูเหมือน “login ไม่ได้” (ล็อกอินผ่านแล้วถูก kick ออก)

5. **Firestore rules / Network**
   - หลัง login จะมี `getDoc(doc(adminDb/publicDb, 'users', uid))`  
   - ถ้า rules ไม่อนุญาตให้อ่าน `users` อาจ error แต่โค้ดยัง `setUser(u)` อยู่ จึงมักไม่ใช่สาเหตุหลักที่ “กด login แล้วไม่เข้า”  
   - ถ้า domain ถูกบล็อกหรือเครือข่ายผิดปกติ อาจติดที่ request ไป Firebase

### แผนดำเนินการ
- ตรวจสอบว่า `.env` มีค่า Firebase ครบและถูกต้อง (โดยไม่ต้องใส่ค่าจริงในรายงาน)
- ตรวจใน Firebase Console: เปิด Email/Password, ตรวจ Authorized domains
- ถ้ามีการแสดง error ใน UI: เก็บข้อความ error (และจาก console) มาพิจารณา
- ถ้าเป็นบัญชี agent: ยืนยันกับผู้ใช้ว่าหลังบ้านจะไม่ให้เข้าโดยออกแบบ; หน้าบ้านใช้ public login ได้
- (ถ้าต้องการ) เพิ่มการ log error จาก `signInWithEmailAndPassword` และจาก `getDoc(doc(..., 'users', uid))` เพื่อให้ดีบักง่ายขึ้น

---

## สรุปลำดับการทำงานที่เสนอ

| ลำดับ | หัวข้อ | การดำเนินการ |
|------|--------|----------------|
| 1 | แผนที่หน้า Properties | ตรวจ/เพิ่ม `VITE_LONGDO_MAP_KEY`, ยืนยันการโหลด Longdo และข้อความ error |
| 2 | สถานที่ใกล้เคียง → Longdo | แก้ `nearbyPlacesService.js` ให้ใช้ Longdo POI + Haversine, เก็บ flow ปุ่มอัปเดตใน Admin เหมือนเดิม |
| 3 | Login ไม่ได้ | ตรวจ Firebase config, Auth method, Authorized domains, และ role agent ตามรายการด้านบน |

ถ้าต้องการให้ลงมือแก้ตามแผนนี้ในโค้ด (เริ่มจากข้อ 1 แล้วไป 2 และ 3) แจ้งได้เลยครับ
