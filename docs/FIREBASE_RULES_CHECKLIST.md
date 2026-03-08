# Firebase Rules & Admin Panel Checklist

## สาเหตุปัญหา Login / ลงรูป

โปรเจกต์ใช้ **2 Firebase App** (public + admin). ถ้าเรียก Firestore/Storage ด้วย **db / storage** (ของ public) ขณะอยู่หลังบ้าน จะใช้ **publicAuth** ซึ่งไม่มีใครล็อกอิน → `request.auth == null` → Rules ไม่อนุญาต

| ปัญหา | วิธีแก้ |
|--------|--------|
| ล็อกอินหลังบ้านแล้ว permission-denied | ใช้ **adminDb** สำหรับทุกการอ่าน/เขียน Firestore จากหลังบ้าน |
| ลงรูปจากหลังบ้านแล้ว storage/unauthorized | ใช้ **adminStorage** สำหรับทุกการอัปโหลดจากหลังบ้าน |

---

## Firestore Rules (สรุป)

- **users**: อ่านได้ถ้าเป็น doc ตัวเอง / email ตรงกับที่ล็อกอิน / หรือเป็น admin หรือ super_admin  
  สร้างได้ถ้าเป็น super_admin หรือสร้าง doc ตัวเอง (`users/{uid}`)  
  `getUserRole()` อ่าน `users/(request.auth.uid)` → ต้องมี doc นี้ (แอป sync ให้ตอนล็อกอิน)
- **blogs, hero_slides, properties, …**: เขียนได้เฉพาะเมื่อ `isAdmin()` หรือตาม rule แต่ละ collection  
  `isAdmin()` ใช้ `getUserRole()` → ต้องมี `users/(request.auth.uid)` ก่อน

ดังนั้นหลังบ้าน **ต้องใช้ adminDb** ทุกที่ที่อ่าน/เขียน Firestore เพื่อให้ `request.auth` เป็น admin ที่ล็อกอิน

---

## Storage Rules (สรุป)

- **blogs, hero_slides, properties, popular_locations**: อ่านได้ทุกคน, เขียนได้ถ้า `request.auth != null`
- **pending_properties**: อ่าน/เขียนได้ทุกคน (ฟอร์มลงประกาศ)

ดังนั้นหลังบ้าน **ต้องใช้ adminStorage** ทุกที่ที่อัปโหลดไฟล์ เพื่อให้ `request.auth` ไม่เป็น null

---

## สิ่งที่แก้แล้วในโค้ด

- ล็อกอิน + role: `AdminAuthContext` ดึง role จาก `users/{uid}` หรือ query by email แล้ว sync ไป `users/{uid}` ผ่าน **adminDb**
- แดชบอร์ด: `useDashboardData(viewRange, adminDb)` และ snapshot ทั้งหมดใช้ **adminDb**
- จัดการสมาชิก: `UserManagement` ใช้ **adminDb** กับ getUsersSnapshot, updateUserRole, deleteUser, suspend, unsuspend
- บทความ: `AdminBlogs` ใช้ **adminDb** กับ getBlogsSnapshot, createBlog, updateBlogById, deleteBlogById และ **adminStorage** กับ uploadBlogImage

---

## หน้าที่ยังใช้ db/storage (ฝั่งหลังบ้าน)

ถ้าหน้าใดในหลังบ้านยังเรียก Firestore/Storage โดยไม่ส่ง **adminDb / adminStorage** จะมีโอกาสเจอ permission-denied:

- ตรวจสอบทุกหน้าที่อยู่ภายใต้ `/sps-internal-admin/*` ว่า:
  - การอ่าน/เขียน Firestore ใช้ **adminDb** (ส่งเป็นพารามิเตอร์หรือใช้ฟังก์ชันที่รับ firestore แล้วส่ง adminDb)
  - การอัปโหลด Storage ใช้ **adminStorage**

---

## Deploy Rules

หลังแก้ไฟล์ rules ให้ deploy ขึ้นโปรเจกต์:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

หรือ deploy ทั้งสอง:

```bash
firebase deploy --only firestore:rules,storage
```
