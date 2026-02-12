# LINE Notifications Setup Guide

## Overview
ระบบ Appointment System จะส่งข้อความแจ้งเตือนไปยัง LINE เมื่อมีลูกค้าหรือเอเจนท์จองนัดเข้าชมโครงการ

## Prerequisites
1. LINE Official Account (Messaging API enabled)
2. Firebase Project ที่มี Cloud Functions enabled
3. Node.js และ Firebase CLI ติดตั้งแล้ว

## Step 1: สร้าง LINE Channel และ Messaging API

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider (ถ้ายังไม่มี)
3. สร้าง Messaging API Channel
4. เปิดใช้งาน Messaging API
5. คัดลอก **Channel Access Token** (จะใช้ใน Step 3)

## Step 2: หา LINE User ID ของ Admin

### วิธีที่ 1: ใช้ Webhook Function (แนะนำ - ง่ายที่สุด)

1. **Deploy Webhook Function:**
   ```bash
   firebase deploy --only functions:lineWebhook
   ```

2. **Copy Webhook URL:**
   - ไปที่ Firebase Console > Functions
   - Copy URL ของ function `lineWebhook` (เช่น `https://asia-southeast2-YOUR_PROJECT.cloudfunctions.net/lineWebhook`)

3. **ตั้งค่า Webhook ใน LINE Developers Console:**
   - ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
   - เลือก Messaging API Channel ของคุณ
   - ไปที่ **Messaging API** > **Webhook settings**
   - ใส่ Webhook URL ที่ copy มา
   - Enable Webhook (เปิดสวิตช์)
   - คลิก **Verify** เพื่อทดสอบ (ควรได้ "Success")

4. **ส่งข้อความเพื่อหา User ID:**
   - เปิด LINE Official Account ของคุณ
   - ส่งข้อความไปที่ Official Account (เช่น "สวัสดี")
   - Function จะ reply กลับมาบอก User ID ของคุณ
   - หรือดู User ID ใน Cloud Functions logs:
     ```bash
     firebase functions:log --only lineWebhook
     ```
   - ดู log ที่มีข้อความ `🚨 USER ID FOUND: U1234567890abcdef`

5. **เพิ่ม Admin คนอื่น:**
   - ให้ Admin คนอื่นๆ ส่งข้อความมาที่ Official Account
   - ดู User ID ใน logs หรือ reply message
   - คัดลอก User IDs ทั้งหมด (คั่นด้วยลูกน้ำ) ไปใส่ใน `LINE_ADMIN_IDS`

### วิธีที่ 2: ใช้ LINE Official Account Manager
1. ไปที่ [LINE Official Account Manager](https://manager.line.biz/)
2. เลือก Official Account ของคุณ
3. ไปที่ Settings > Account settings > Messaging API
4. คลิก "Issue" เพื่อสร้าง QR Code
5. Scan QR Code ด้วย LINE ของคุณ
6. ส่งข้อความไปที่ Official Account
7. ดู User ID ใน Webhook logs หรือใช้ LINE API เพื่อดึง User ID

### วิธีที่ 3: ใช้ LINE API Explorer
1. ไปที่ [LINE API Reference](https://developers.line.biz/en/reference/messaging-api/)
2. ใช้ API: `GET /v2/bot/profile/{userId}` เพื่อทดสอบ User ID

## Step 3: ตั้งค่า Secrets และ Environment Variables

### Firebase Secrets (v2) - แนะนำสำหรับ Production

**ตั้งค่า LINE_TOKEN Secret:**
```bash
firebase functions:secrets:set LINE_TOKEN
```
- เมื่อรันคำสั่งนี้ ระบบจะถามให้ใส่ค่า Channel Access Token
- หรือใช้ `echo "YOUR_TOKEN" | firebase functions:secrets:set LINE_TOKEN`

**ตั้งค่า LINE_ADMIN_IDS (Environment Variable):**

**สำหรับ Admin คนเดียว:**
```bash
firebase functions:config:set line.admin_ids="YOUR_ADMIN_USER_ID"
```

**สำหรับ Admin หลายคน (คั่นด้วยลูกน้ำ):**
```bash
firebase functions:config:set line.admin_ids="U1234567890abcdef,U0987654321fedcba,U1111111111111111"
```

**หมายเหตุ:** 
- `LINE_TOKEN` ใช้ Firebase Secrets (ปลอดภัยกว่า)
- `LINE_ADMIN_IDS` ใช้ Firebase Config (ไม่ sensitive)
- User IDs คั่นด้วยลูกน้ำ (comma) โดยไม่มีช่องว่างหรือมีช่องว่างก็ได้ (ระบบจะ trim อัตโนมัติ)

### Local Development (ใช้ .env)

สร้างไฟล์ `.env` ในโฟลเดอร์ `functions/`:

**สำหรับ Admin คนเดียว:**
```env
LINE_TOKEN=YOUR_CHANNEL_ACCESS_TOKEN
LINE_ADMIN_IDS=YOUR_ADMIN_USER_ID
```

**สำหรับ Admin หลายคน (คั่นด้วยลูกน้ำ):**
```env
LINE_TOKEN=YOUR_CHANNEL_ACCESS_TOKEN
LINE_ADMIN_IDS=U1234567890abcdef,U0987654321fedcba,U1111111111111111
```

**หมายเหตุ:** 
- `.env` จะไม่ถูก commit ไป Git (ควรอยู่ใน `.gitignore`)
- สำหรับ local development เท่านั้น

## Step 4: Install Dependencies และ Deploy

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Step 5: ทดสอบระบบ

1. ไปที่หน้า Property Detail ในเว็บไซต์
2. กรอกฟอร์ม "สำหรับลูกค้า" หรือ "สำหรับเอเจนท์"
3. ส่งคำขอ
4. ตรวจสอบว่าได้รับข้อความใน LINE Official Account

## Troubleshooting

### ไม่ได้รับข้อความ LINE

1. **ตรวจสอบ Channel Access Token:**
   ```bash
   firebase functions:config:get
   ```

2. **ตรวจสอบ Admin IDs:**
   - ตรวจสอบว่า `LINE_ADMIN_IDS` ถูกต้องและเป็น User IDs ของคนที่ต้องการรับข้อความ
   - ตรวจสอบว่า User IDs คั่นด้วยลูกน้ำถูกต้อง (เช่น `U123...,U456...`)
   - ตรวจสอบว่าไม่มีช่องว่างหรืออักขระพิเศษ

3. **ตรวจสอบ Cloud Functions Logs:**
   ```bash
   firebase functions:log
   ```
   - ดู log ว่า "No Admin IDs configured" หรือไม่
   - ดู log ว่า "ส่งข้อความ LINE สำเร็จไปยัง X Admin(s)" หรือไม่

4. **ตรวจสอบ LINE API Status:**
   - ไปที่ LINE Developers Console > Messaging API > Statistics
   - ดูว่ามี error rate หรือไม่

### Error: "LINE_TOKEN ไม่พบ"

- ตรวจสอบว่าได้ตั้งค่า Firebase Secret แล้ว:
  ```bash
  firebase functions:secrets:access LINE_TOKEN
  ```
- ตรวจสอบว่า Function มี `secrets: ['LINE_TOKEN']` ใน `runWith()`:
  ```javascript
  .runWith({
    secrets: ['LINE_TOKEN'],
  })
  ```
- สำหรับ local development: ตรวจสอบว่า `.env` มี `LINE_TOKEN`

### Error: "LINE config ไม่ครบ"

- ตรวจสอบว่าได้ตั้งค่า `LINE_ADMIN_IDS` แล้ว:
  ```bash
  firebase functions:config:get
  ```
- ตรวจสอบว่าใช้ `LINE_ADMIN_IDS` (เติม S) แทน `LINE_ADMIN_USER_ID`

### Error: "No Admin IDs configured"

- ตรวจสอบว่าได้ตั้งค่า `LINE_ADMIN_IDS` แล้ว
- ตรวจสอบว่า User IDs ไม่ว่างเปล่าและคั่นด้วยลูกน้ำถูกต้อง
- ตรวจสอบว่าไม่มีช่องว่างหรืออักขระพิเศษใน User IDs

### Error: "Unauthorized" หรือ "Invalid token"

- ตรวจสอบว่า Channel Access Token ถูกต้องและยังไม่หมดอายุ
- สร้าง Channel Access Token ใหม่ใน LINE Developers Console

### Multicast API Limitations

- LINE Multicast API รองรับสูงสุด **500 User IDs** ต่อครั้ง
- หากมี Admin มากกว่า 500 คน ต้องแบ่งส่งหลายครั้ง

## Message Format

### Customer Appointment
```
👤 **ลูกค้าใหม่สนใจจอง!**

📋 รายละเอียด:
• ชื่อ: [ชื่อลูกค้า]
• เบอร์โทร: [เบอร์โทร]
• รหัสทรัพย์: [รหัสทรัพย์]
• ชื่อโครงการ: [ชื่อโครงการ]
• วันที่เข้าชม: [วันที่]
• เวลา: [เวลา]

📅 สร้างเมื่อ: [วันที่และเวลา]
```

### Agent Appointment
```
👔 **เอเจนท์พาลูกค้าเข้าชม!**

📋 รายละเอียด:
• ชื่อเอเจนท์: [ชื่อเอเจนท์]
• เบอร์โทรเอเจนท์: [เบอร์โทร]
• ชื่อลูกค้า: [ชื่อลูกค้า]
• รหัสทรัพย์: [รหัสทรัพย์]
• ชื่อโครงการ: [ชื่อโครงการ]
• วันที่เข้าชม: [วันที่]
• เวลา: [เวลา]

📅 สร้างเมื่อ: [วันที่และเวลา]
```

## Security Notes

1. **อย่า commit Channel Access Token ลง Git**
2. **ใช้ Environment Variables หรือ Firebase Config เท่านั้น**
3. **หมั่นตรวจสอบ Logs เพื่อดูว่ามี unauthorized access หรือไม่**
4. **จำกัดสิทธิ์การเข้าถึง Firebase Functions ให้เฉพาะ Admin**

## Support

หากมีปัญหาหรือคำถาม:
1. ตรวจสอบ [LINE Developers Documentation](https://developers.line.biz/en/docs/)
2. ตรวจสอบ [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
3. ดู Logs ใน Firebase Console > Functions > Logs
