SPS Property Solution

ระบบบริหารจัดการอสังหาริมทรัพย์ (Property Listing & Management) สำหรับทีม SPS เน้นการใช้งานจริง ทั้งฝั่งลูกค้า (Public) และฝั่งแอดมิน (Admin) ทำงานบน Firebase + Vite + React และเชื่อมต่อแผนที่ด้วย Longdo Map

---

## Overview

**SPS Property Solution** เป็น Single Page Application (SPA) ที่แบ่งเป็น 2 ส่วนหลัก:
- **Public Site**: หน้าเว็บสำหรับลูกค้า ค้นหาทรัพย์, ดูรายละเอียด, บันทึกเป็นรายการโปรด, สมัคร/ล็อกอินสมาชิก
- **Admin Site** (`/sps-internal-admin`): แดชบอร์ดสำหรับทีมงาน จัดการทรัพย์, รูปภาพ, สไลด์หน้าแรก, บทความ, ผู้ใช้, Log การใช้งาน ฯลฯ

ใช้ **Firebase** เป็น Backend หลัก (Authentication, Firestore, Storage, Hosting, Cloud Functions) และใช้ **Longdo Map** สำหรับแผนที่ทรัพย์และสถานที่ใกล้เคียง

---

## Key Features

- **Property Listing & Search**
  - หน้า `Home`, `Properties`, `PropertyDetail`, `SharePage` สำหรับลูกค้า
  - ฟิลเตอร์ค้นหาทรัพย์ขั้นสูง, Saved search, รายการโปรด

- **Admin Dashboard**
  - จัดการประกาศทรัพย์ (`PropertyForm`, `PropertyListPage`, `PendingProperties`, `MyProperties`)
  - จัดการหน้าแรก (Hero, Sections, Popular Locations)
  - จัดการ Lead/นัดหมาย, บทความ (`Blogs`), ผู้ใช้, Settings

- **Authentication & Roles**
  - แยก `PublicAuthContext` กับ `AdminAuthContext`
  - รองรับ role เช่น `member`, `admin`, `super_admin`, block `agent` เข้าหน้า admin
  - Login แยกหน้า: `/login` (public) และ `/sps-internal-admin/login`

- **Map & Nearby Places**
  - ใช้ **Longdo Map** แสดงแผนที่ทรัพย์ในหน้า Properties และ MapPicker ตอนกรอกทรัพย์
  - ดึง “สถานที่สำคัญใกล้เคียง” รอบทรัพย์จาก **Longdo POI API** (โรงพยาบาล, ห้าง, การศึกษา, นิคมฯ ฯลฯ)

- **อื่น ๆ**
  - ระบบ Activity Logs, Dashboard สรุปข้อมูล, Export ข้อมูลทรัพย์
  - UI ใช้ Tailwind CSS + component ที่ออกแบบให้เหมาะกับงานจริง

---

## Tech Stack

- **Frontend**
  - React (ผ่าน Vite)
  - React Router DOM
  - Tailwind CSS
  - Lucide React (icons)

- **Backend / Infra**
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Storage
  - Firebase Hosting
  - Firebase Cloud Functions (โฟลเดอร์ `functions/`)

- **3rd Party Services**
  - Longdo Map (แผนที่ + Nearby POI)
  - Cloudinary (อัปโหลด/จัดการรูปภาพ)

---

## Project Structure (ย่อ)

- `src/`
  - `pages/` – หน้า Public (`Home`, `Properties`, `PropertyDetail`, `Blogs`, `Profile`, `PublicLogin`, ฯลฯ)
  - `admin/` – หน้า Admin (`Dashboard`, `PropertyForm`, `PropertyListPage`, `Settings`, `UserManagement`, `LeadsInbox`, ฯลฯ)
  - `components/` – UI components ที่ใช้ซ้ำ (Card, Map, Slider, Form, ProtectedRoute ฯลฯ)
  - `context/` – Context ต่าง ๆ เช่น `AdminAuthContext`, `PublicAuthContext`, `SearchContext`
  - `lib/` – helper / service ระดับต่ำ เช่น `firebase.js`, `firestore.js`, `googleMapsUrl.js`, `longdoMapLoader.js`, `authErrorMessages.js`
  - `services/` – service ระดับธุรกิจ เช่น `nearbyPlacesService.js`, `activityLogger.js`
  - `data/` – mock data / static data เช่น location list
- `functions/`
  - Cloud Functions (เช่น integration กับ LINE, ระบบนัดหมาย – ดูไฟล์ `functions/SETUP.md`, `functions/LINE_SETUP.md`, `functions/SECRETS_SETUP.md`)
- `docs/`
  - เอกสารประกอบ เช่น `REPORT_3_ITEMS.md`, `APPOINTMENT_SYSTEM.md`

---

## Getting Started

### 1. ติดตั้งเครื่องมือพื้นฐาน

- แนะนำ **Node.js 20+**
- ติดตั้ง npm หรือใช้ pnpm/yarn ตามสะดวก (ตัวอย่างใช้ npm)

### 2. Clone โปรเจ็กต์

```bash
git clone https://github.com/kittisakjitmon-tech/sps-property-project.git
cd sps-property
```

### 3. ติดตั้ง dependencies

รันใน root:

```bash
npm install
```

ถ้าใช้ Cloud Functions:

```bash
cd functions
npm install
cd ..
```

### 4. ตั้งค่า Environment Variables

1. ดูตัวอย่างในไฟล์ `.env.example`
2. สร้างไฟล์ `.env` ที่ root ของโปรเจ็กต์ และใส่ค่าตัวแปรให้ครบ เช่น

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...

VITE_GOOGLE_PLACES_API_KEY=...          # ใช้เฉพาะฟีเจอร์ที่ยังอิง Google Places (ถ้ามี)
VITE_LONGDO_MAP_KEY=...                 # ใช้กับ Longdo Map และ Longdo POI
```

> หมายเหตุ: ทุกตัวแปรต้องขึ้นต้นด้วย `VITE_` เพื่อให้ Vite มองเห็น (`import.meta.env` ในโค้ด)

หลังแก้ `.env` แล้ว **ต้องรีสตาร์ท dev server** ทุกครั้ง

### 5. รัน Development Server

```bash
npm run dev
```

ค่าเริ่มต้นของ Vite คือ `http://localhost:5173`

---

## Firebase Setup (สรุป)

- สร้างโปรเจกต์ใน Firebase Console ให้ตรงกับค่าใน `.env` (โดยเฉพาะ `VITE_FIREBASE_PROJECT_ID`)
- เปิดบริการ:
  - Authentication → เปิด provider **Email/Password**
  - Firestore Database → โหมดที่เหมาะสม (ตาม `firestore.rules`)
  - Storage → ใช้สำหรับรูปภาพทรัพย์
  - Hosting → สำหรับ deploy frontend
- ถ้าใช้ Cloud Functions:
  - ติดตั้ง Firebase CLI
  - รัน `firebase init functions` (ครั้งแรกถ้ายังไม่ได้ setup) และดูคำอธิบายใน `functions/SETUP.md`

ตัวอย่างคำสั่ง deploy เบื้องต้น:

```bash
firebase deploy --only hosting,functions
```

---

## Scripts ที่สำคัญ

- **`npm run dev`** – รัน dev server (Vite)
- **`npm run build`** – build production
- **`npm run preview`** – preview build ที่ได้แบบ local
- **`npm run lint`** – เช็คโค้ดด้วย ESLint

ถ้ามี Cloud Functions เพิ่มเติม ดูสคริปต์ใน `functions/package.json`

---

## หมายเหตุสำหรับการพัฒนา

- อย่าคอมมิตไฟล์ `.env` หรือไฟล์ secret ใด ๆ (ถูก ignore ไว้ใน `.gitignore` แล้ว)
- ถ้าแก้ config ของ Firebase หรือ Map (เช่น key ใหม่) ให้ตรวจสอบว่า:
  - `.env` ถูกต้อง
  - Firebase Console เปิด Email/Password แล้ว
  - Longdo Map key ตรงกับ account ที่ใช้จริง

หากต้องการเพิ่มเอกสารเพิ่มเติม สามารถสร้างในโฟลเดอร์ `docs/` เพื่อเก็บ flow ธุรกิจ, API design หรือ guideline การใช้งานสำหรับทีมงานภายในต่อไป

