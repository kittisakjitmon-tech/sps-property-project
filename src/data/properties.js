/**
 * Mock property listings for SPS Property Solution
 */
export const properties = [
  {
    id: 1,
    title: 'คอนโดหรู ใกล้ BTS อารีย์ พร้อมเฟอร์นิเจอร์',
    price: 8500000,
    type: 'คอนโดมิเนียม',
    location: { province: 'กรุงเทพมหานคร', district: 'พญาไท' },
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ],
    bedrooms: 2,
    bathrooms: 2,
    area: 45,
    description: 'คอนโดมิเนียมใหม่ ติด BTS อารีย์ เดินไม่ถึง 5 นาที ห้องพร้อมเฟอร์นิเจอร์ครบ ระบบรักษาความปลอดภัย 24 ชม. สระว่ายน้ำ ฟิตเนส',
    agentContact: { name: 'คุณสมชาย', lineId: 'spsproperty01', phone: '081-234-5678' },
    featured: true,
  },
  {
    id: 2,
    title: 'บ้านเดี่ยว 2 ชั้น สวนใหญ่ บางนา',
    price: 12500000,
    type: 'บ้านเดี่ยว',
    location: { province: 'กรุงเทพมหานคร', district: 'บางนา' },
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
    bedrooms: 4,
    bathrooms: 3,
    area: 180,
    description: 'บ้านเดี่ยว 2 ชั้น พื้นที่ใช้สอยกว้าง สวนหลังบ้านร่มรื่น ใกล้โรงเรียนและห้างสรรพสินค้า โครงการมีรั้วรอบขอบชิด',
    agentContact: { name: 'คุณสมหญิง', lineId: 'spsproperty02', phone: '082-345-6789' },
    featured: true,
  },
  {
    id: 3,
    title: 'ทาวน์โฮม 3 ชั้น พร้อมที่จอด 2 คัน ชลบุรี',
    price: 5900000,
    type: 'ทาวน์โฮม',
    location: { province: 'ชลบุรี', district: 'ศรีราชา' },
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    ],
    bedrooms: 3,
    bathrooms: 3,
    area: 120,
    description: 'ทาวน์โฮมใหม่ โครงการใกล้ทะเลศรีราชา ที่จอดรถ 2 คัน ใช้ชีวิตสบาย ใกล้ศูนย์การค้าและโรงพยาบาล',
    agentContact: { name: 'คุณวิชัย', lineId: 'spsproperty03', phone: '083-456-7890' },
    featured: true,
  },
  {
    id: 4,
    title: 'คอนโดวิวภูเขา เชียงใหม่ ใกล้มหาวิทยาลัย',
    price: 3200000,
    type: 'คอนโดมิเนียม',
    location: { province: 'เชียงใหม่', district: 'เมืองเชียงใหม่' },
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    ],
    bedrooms: 1,
    bathrooms: 1,
    area: 28,
    description: 'คอนโดมิเนียมวิวดอยสุเทพ ใกล้มหาวิทยาลัยเชียงใหม่ อากาศดี เหมาะสำหรับนักศึกษาและคนทำงาน',
    agentContact: { name: 'คุณดวงใจ', lineId: 'spsproperty04', phone: '084-567-8901' },
    featured: false,
  },
  {
    id: 5,
    title: 'วิลล่าหน้าทะเล ภูเก็ต พร้อมสระส่วนตัว',
    price: 28500000,
    type: 'วิลล่า',
    location: { province: 'ภูเก็ต', district: 'กะทู้' },
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    ],
    bedrooms: 5,
    bathrooms: 4,
    area: 350,
    description: 'วิลล่าหน้าทะเลภูเก็ต สระว่ายน้ำส่วนตัว ดีไซน์โมเดิร์น ใกล้ชายหาดกะทู้ ลงทุนหรือพักอาศัย',
    agentContact: { name: 'คุณภูเก็ต', lineId: 'spsproperty05', phone: '085-678-9012' },
    featured: true,
  },
  {
    id: 6,
    title: 'บ้านเช่าพร้อมอยู่ ขอนแก่น ใกล้มหาวิทยาลัย',
    price: 15000,
    type: 'บ้านเช่า',
    location: { province: 'ขอนแก่น', district: 'เมืองขอนแก่น' },
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
    ],
    bedrooms: 2,
    bathrooms: 2,
    area: 80,
    description: 'บ้านเช่าพร้อมอยู่ ใกล้มหาวิทยาลัยขอนแก่น ค่าเช่า 15,000 บาท/เดือน รวมค่าส่วนกลางแล้ว',
    agentContact: { name: 'คุณขอนแก่น', lineId: 'spsproperty06', phone: '086-789-0123' },
    featured: false,
    isRental: true,
  },
]

export function getPropertyById(id) {
  const numId = Number(id)
  return properties.find((p) => p.id === numId) ?? null
}

export function getFeaturedProperties() {
  return properties.filter((p) => p.featured)
}
