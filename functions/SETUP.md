# AI Image Enhancement Pipeline - Setup

ระบบนี้ทำงานอัตโนมัติเมื่อมีรูปภาพใหม่ถูกอัปโหลดไปที่ `properties/{propertyId}/` ใน Firebase Storage โดยจะส่งไป Cloudinary เพื่อปรับแต่งภาพ AI และอัปเดต URL ใน Firestore ให้ใช้รูปที่สวยงามแล้ว

---

## 1. ติดตั้ง Dependencies

```bash
cd functions
npm install
```

Dependencies ที่ใช้:
- `firebase-admin` – เข้าถึง Storage, Firestore
- `firebase-functions` – Cloud Functions runtime
- `cloudinary` – อัปโหลดและแปลงภาพผ่าน Cloudinary API

---

## 2. ตั้งค่า Cloudinary (Environment Config)

ใช้ Firebase Functions config เพื่อเก็บค่าลับ (ไม่ hardcode):

```bash
firebase functions:config:set cloudinary.cloud_name="dhqvmo8dd" cloudinary.api_key="564937324254638" cloudinary.api_secret="ohgjDqMdhlV1AVHwg5D228bPOjU"
```

**วิธีหา Cloudinary credentials:**
1. สมัคร/เข้าสู่ [Cloudinary Console](https://console.cloudinary.com/)
2. ที่ Dashboard จะมี **Cloud name**, **API Key**, **API Secret**
3. แทนที่ค่าข้างบนด้วยค่าจาก Console

ตรวจสอบว่า config ถูกต้อง:
```bash
firebase functions:config:get cloudinary
```

---

## 3. Deploy Functions

```bash
firebase deploy --only functions
```

หรือ deploy เฉพาะฟังก์ชันนี้:
```bash
firebase deploy --only functions:onPropertyImageFinalized
```

---

## 4. การทำงานของระบบ

| ขั้นตอน | รายละเอียด |
|---------|------------|
| 1 | User อัปโหลดรูปใน Admin → บันทึกลง `properties/{propertyId}/{timestamp}_{filename}` |
| 2 | Storage Trigger (`onFinalize`) ทำงานเมื่ออัปโหลดเสร็จ |
| 3 | ดาวน์โหลดไฟล์ → ส่งไป Cloudinary (AI improve, auto-rotate, q_auto, f_auto) |
| 4 | อัปเดต Firestore `properties/{id}.images[]` ด้วย URL จาก Cloudinary แทน URL เดิม |

---

## 5. Usage Note – Frontend Admin

**ไม่ต้องแก้โค้ดฝั่ง Frontend Admin เลย** – ระบบนี้ทำงานหลังบ้านโดยอัตโนมัติ:

- Admin ยังอัปโหลดรูปเหมือนเดิม → บันทึกลง Firebase Storage
- หลังจากนั้น Cloud Function จะ:
  1. รับรูปจาก Storage
  2. ส่งไป Cloudinary และปรับแต่งภาพ
  3. อัปเดต URL ใน Firestore ให้เป็น URL ที่ปรับแต่งแล้ว

เมื่อ Admin หรือผู้ใช้เปิดดูทรัพย์สิน จะได้รูปที่ผ่าน AI enhancement แล้วโดยไม่ต้องเปลี่ยนโค้ด

---

## 6. Cloudinary Transformations ที่ใช้

| Parameter | ความหมาย |
|-----------|----------|
| `e_improve:outdoor` | ปรับแสง สี ความคมชัดเหมาะกับภาพกลางแจ้ง |
| `a_auto` | ปรับหมุนภาพและ perspective อัตโนมัติ (เหมาะกับภาพอสังหาฯ) |
| `q_auto` | ปรับคุณภาพอัตโนมัติ |
| `f_auto` | เลือก format อัตโนมัติ (เช่น WebP) เพื่อให้โหลดเร็วขึ้น |
