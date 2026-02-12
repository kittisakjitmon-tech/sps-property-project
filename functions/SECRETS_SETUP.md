# Firebase Secrets Setup Guide

## Overview
ระบบใช้ Firebase Secrets (v2) สำหรับข้อมูลที่ sensitive เช่น LINE Channel Access Token

## Migration from functions.config() to Secrets

### Old Way (Deprecated)
```bash
firebase functions:config:set line.channel_access_token="YOUR_TOKEN"
```

### New Way (Recommended)
```bash
firebase functions:secrets:set LINE_TOKEN
```

## Setup Instructions

### Step 1: Set LINE_TOKEN Secret

```bash
firebase functions:secrets:set LINE_TOKEN
```

เมื่อรันคำสั่งนี้:
1. ระบบจะถามให้ใส่ค่า Channel Access Token
2. พิมพ์หรือ paste Token ของคุณ
3. กด Enter

**Alternative (Non-interactive):**
```bash
echo "YOUR_CHANNEL_ACCESS_TOKEN" | firebase functions:secrets:set LINE_TOKEN
```

### Step 2: Set LINE_ADMIN_IDS (Environment Variable)

`LINE_ADMIN_IDS` ไม่ใช่ secret (ไม่ sensitive) จึงใช้ Firebase Config:

**สำหรับ Admin คนเดียว:**
```bash
firebase functions:config:set line.admin_ids="YOUR_ADMIN_USER_ID"
```

**สำหรับ Admin หลายคน (คั่นด้วยลูกน้ำ):**
```bash
firebase functions:config:set line.admin_ids="U1234567890abcdef,U0987654321fedcba,U1111111111111111"
```

### Step 3: Verify Configuration

**ตรวจสอบ Secrets:**
```bash
firebase functions:secrets:access LINE_TOKEN
```

**ตรวจสอบ Config:**
```bash
firebase functions:config:get
```

### Step 4: Deploy Functions

```bash
firebase deploy --only functions
```

## Local Development

สำหรับ local development สร้างไฟล์ `.env` ในโฟลเดอร์ `functions/`:

```env
LINE_TOKEN=YOUR_CHANNEL_ACCESS_TOKEN
LINE_ADMIN_IDS=U1234567890abcdef,U0987654321fedcba
```

**หมายเหตุ:** `.env` จะไม่ถูก commit ไป Git (ควรอยู่ใน `.gitignore`)

## Security Best Practices

1. ✅ **ใช้ Secrets สำหรับ sensitive data** (LINE_TOKEN)
2. ✅ **ใช้ Config สำหรับ non-sensitive data** (LINE_ADMIN_IDS)
3. ✅ **อย่า commit secrets ลง Git**
4. ✅ **หมั่น rotate secrets เป็นประจำ**

## Troubleshooting

### Error: "LINE_TOKEN ไม่พบ"

1. ตรวจสอบว่าได้ตั้งค่า Secret แล้ว:
   ```bash
   firebase functions:secrets:access LINE_TOKEN
   ```

2. ตรวจสอบว่า Function มี `secrets: ['LINE_TOKEN']` ใน `runWith()`:
   ```javascript
   .runWith({
     secrets: ['LINE_TOKEN'],
   })
   ```

3. สำหรับ local development: ตรวจสอบว่า `.env` มี `LINE_TOKEN`

### Error: "LINE_ADMIN_IDS ไม่พบ"

1. ตรวจสอบว่าได้ตั้งค่า Config แล้ว:
   ```bash
   firebase functions:config:get
   ```

2. ตรวจสอบว่าใช้ `line.admin_ids` (ไม่ใช่ `line.admin_id`)

## Migration Checklist

- [ ] Set `LINE_TOKEN` secret: `firebase functions:secrets:set LINE_TOKEN`
- [ ] Set `LINE_ADMIN_IDS` config: `firebase functions:config:set line.admin_ids="..."`
- [ ] Verify secrets: `firebase functions:secrets:access LINE_TOKEN`
- [ ] Verify config: `firebase functions:config:get`
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Test appointment creation
- [ ] Verify LINE notifications received

## References

- [Firebase Secrets Documentation](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
