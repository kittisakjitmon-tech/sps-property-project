# Appointment System with LINE Notifications

## Overview
ระบบนัดหมายเข้าชมโครงการที่รองรับ 2 ประเภทผู้ใช้ (ลูกค้าและเอเจนท์) พร้อมการแจ้งเตือนผ่าน LINE Messaging API

## Architecture

### Frontend (React)
- **File:** `src/pages/PropertyDetail.jsx`
- **Component:** `LeadForm`
- **Features:**
  - Tab System สำหรับสลับระหว่าง "สำหรับลูกค้า" และ "สำหรับเอเจนท์"
  - Form Validation (ชื่อ, เบอร์โทร, วันที่, เวลา)
  - Success Alert เมื่อส่งสำเร็จ

### Backend (Firebase)
- **Firestore Collection:** `appointments`
- **Cloud Function:** `onAppointmentCreated` (trigger เมื่อมี document ใหม่)
- **LINE Integration:** ส่งข้อความแจ้งเตือนไปยัง LINE Official Account

## Data Structure

### Customer Appointment
```json
{
  "type": "Customer",
  "contactName": "ชื่อลูกค้า",
  "tel": "0812345678",
  "date": "2024-02-15",
  "time": "14:00",
  "propertyId": "SPS-TW-90",
  "propertyTitle": "บ้านเดี่ยว 2 ชั้น",
  "createdAt": "2024-02-10T10:30:00Z"
}
```

### Agent Appointment
```json
{
  "type": "Agent",
  "agentName": "ชื่อเอเจนท์",
  "contactName": "ชื่อลูกค้า",
  "tel": "0812345678",
  "date": "2024-02-15",
  "time": "14:00",
  "propertyId": "SPS-TW-90",
  "propertyTitle": "บ้านเดี่ยว 2 ชั้น",
  "createdAt": "2024-02-10T10:30:00Z"
}
```

## Flow

1. **User fills form** → Frontend validates input
2. **Submit** → `createAppointment()` saves to Firestore `appointments` collection
3. **Firestore Trigger** → `onAppointmentCreated` Cloud Function executes
4. **Format Message** → Function formats message based on `type` (Customer/Agent)
5. **Send LINE** → Function sends formatted message to LINE Messaging API
6. **Admin receives** → Admin receives notification in LINE Official Account

## Setup Instructions

### 1. Frontend (Already Implemented)
✅ Tab System
✅ Form Fields
✅ Validation
✅ Success Alert

### 2. Backend Setup

#### Step 1: Install Dependencies
```bash
cd functions
npm install
```

#### Step 2: Configure LINE API

**สำหรับ Admin คนเดียว:**
```bash
firebase functions:config:set \
  line.channel_access_token="YOUR_CHANNEL_ACCESS_TOKEN" \
  line.admin_ids="YOUR_ADMIN_USER_ID"
```

**สำหรับ Admin หลายคน (คั่นด้วยลูกน้ำ):**
```bash
firebase functions:config:set \
  line.channel_access_token="YOUR_CHANNEL_ACCESS_TOKEN" \
  line.admin_ids="U1234567890abcdef,U0987654321fedcba,U1111111111111111"
```

**หมายเหตุ:** ระบบใช้ LINE Multicast API เพื่อส่งข้อความไปหลาย Admin พร้อมกัน

**ดูรายละเอียดเพิ่มเติม:** `functions/LINE_SETUP.md`

#### Step 3: Deploy Cloud Functions
```bash
firebase deploy --only functions
```

## Testing

1. ไปที่หน้า Property Detail
2. เลือก Tab "สำหรับลูกค้า" หรือ "สำหรับเอเจนท์"
3. กรอกข้อมูลในฟอร์ม
4. กดส่ง
5. ตรวจสอบ:
   - Success alert แสดงขึ้น
   - Document ถูกสร้างใน Firestore `appointments` collection
   - ข้อความถูกส่งไป LINE Official Account

## Files Modified/Created

### Frontend
- ✅ `src/pages/PropertyDetail.jsx` - Updated LeadForm component
- ✅ `src/lib/firestore.js` - Added `createAppointment()` function

### Backend
- ✅ `functions/index.js` - Added `onAppointmentCreated` Cloud Function
- ✅ `functions/package.json` - Added `axios` dependency
- ✅ `functions/LINE_SETUP.md` - Setup documentation

## Error Handling

- **Frontend:** Form validation, error messages, loading states
- **Backend:** Try-catch blocks, error logging, graceful failures (ไม่ throw error เพื่อไม่ให้ Firestore write ล้มเหลว)

## Security

- ✅ Environment Variables สำหรับ sensitive data (LINE tokens)
- ✅ Firestore Security Rules (ควรตั้งค่าให้เฉพาะ authenticated users สามารถสร้าง appointments ได้)
- ✅ Input validation (เบอร์โทร, วันที่, เวลา)

## Future Enhancements

- [ ] Email notifications
- [ ] SMS notifications
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Admin dashboard สำหรับดู appointments
- [ ] Reminder notifications (1 วันก่อนนัด)
- [ ] Cancel/Reschedule functionality
