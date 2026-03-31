/**
 * Script to update all properties in Firestore with commissionRate: 3
 * Run: node scripts/update-commission-rate.js
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

// Load service account from environment or file
const serviceAccount = JSON.parse(readFileSync('./.env.json', 'utf8'))

initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()

async function updateAllProperties() {
  console.log('🔄 เริ่มอัปเดต commissionRate = 3 สำหรับทุกทรัพย์...\n')

  const propertiesRef = db.collection('properties')
  const snapshot = await propertiesRef.get()

  console.log(`📊 พบทรัพย์ทั้งหมด ${snapshot.size} รายการ\n`)

  if (snapshot.empty) {
    console.log('❌ ไม่พบทรัพย์ใน Firestore')
    process.exit(0)
  }

  let updated = 0
  let skipped = 0

  const batch = db.batch()

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    const currentCommissionRate = data.commissionRate

    if (currentCommissionRate === 3 || currentCommissionRate === '3') {
      skipped++
      return
    }

    batch.update(doc.ref, {
      commissionRate: 3,
      updatedAt: new Date(),
    })
    updated++
  })

  if (updated > 0) {
    await batch.commit()
    console.log(`✅ อัปเดตสำเร็จ ${updated} รายการ`)
  } else {
    console.log('ℹ️  ไม่มีทรัพย์ที่ต้องอัปเดต (ทั้งหมดมี commissionRate = 3 อยู่แล้ว)')
  }

  if (skipped > 0) {
    console.log(`⏭️  ข้าม ${skipped} รายการที่มี commissionRate = 3 อยู่แล้ว`)
  }

  console.log('\n✨ เสร็จสิ้น!')
}

updateAllProperties().catch((err) => {
  console.error('❌ เกิดข้อผิดพลาด:', err)
  process.exit(1)
})
