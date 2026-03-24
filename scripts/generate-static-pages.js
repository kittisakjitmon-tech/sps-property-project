#!/usr/bin/env node
/**
 * SSG (Static Site Generation) for Property Detail Pages
 * Hybrid: Static HTML + React Hydration Support
 * 
 * Usage:
 *   npm run generate:ssg
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin SDK
const admin = require('firebase-admin');

// Configuration
const BASE_URL = 'https://spspropertysolution.com';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'firebase-service-account.json');

function initFirebase() {
  try {
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized');
    } else {
      console.warn('⚠️ Service account not found');
    }
  } catch (error) {
    console.error('❌ Firebase init error:', error.message);
  }
}

async function fetchProperties() {
  const db = admin.firestore();
  const snapshot = await db.collection('properties').get();
  const properties = [];
  snapshot.forEach(doc => properties.push({ id: doc.id, ...doc.data() }));
  console.log(`✅ Found ${properties.length} properties`);
  return properties;
}

function generatePropertySlug(property) {
  if (!property?.id) return '';
  const parts = [];
  const loc = property.location || {};
  if (loc.district) parts.push(sanitizeSlug(loc.district));
  if (loc.province) parts.push(sanitizeSlug(loc.province));
  const typeLabel = getPropertyLabel(property.type);
  if (typeLabel) parts.push(sanitizeSlug(typeLabel));
  parts.push(property.isRental ? 'เช่า' : 'ขาย');
  const priceSlug = formatPriceForSlug(property.price);
  if (priceSlug) parts.push(priceSlug);
  const body = parts.filter(Boolean).join('-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return body ? `${body}--${property.id}` : `property--${property.id}`;
}

function sanitizeSlug(str) {
  return String(str || '').trim().replace(/\s+/g, '-').replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\-.]/g, '');
}

function formatPriceForSlug(price) {
  const num = Number(price);
  if (!Number.isFinite(num) || num <= 0) return '';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}m`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}

function getPropertyLabel(type) {
  const labels = {
    'SPS-TH-1CLASS-ID': 'ทาวน์โฮม-1-ชั้น',
    'SPS-TH-2CLASS-ID': 'ทาวน์โฮม-2-ชั้น',
    'SPS-S-1CLASS-ID': 'บ้านเดี่ยว-1-ชั้น',
    'SPS-CD-ID': 'คอนโด',
    'SPS-LL-ID': 'ที่ดิน',
    'SPS-BL-ID': 'อาคารพาณิชย์',
  };
  return labels[type] || type || '';
}

function formatPrice(price, isRental) {
  if (!price) return 'ราคาติดต่อสอบถาม';
  const formatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 });
  const formatted = formatter.format(price);
  return isRental ? `${formatted}/เดือน` : formatted;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function generatePropertyHTML(property) {
  const slug = generatePropertySlug(property);
  const canonicalUrl = `${BASE_URL}/properties/${encodeURIComponent(slug)}`;
  const title = `${property.title} | SPS Property Solution`;
  const description = (property.description || '').slice(0, 160);
  const loc = property.location || {};
  const locationDisplay = `${loc.district || ''}${loc.district && loc.province ? ', ' : ''}${loc.province || ''}`;
  
  // Get primary image - use Cloudinary with large size for OG
  let primaryImage = property.coverImageUrl || (property.images && property.images[0]) || '';
  
  // If Cloudinary URL, add transformation for larger size
  if (primaryImage.includes('res.cloudinary.com')) {
    // Transform to 1200x630 (LINE optimal size)
    primaryImage = primaryImage.replace('/upload/', '/upload/w_1200,h_630,c_fill,f_auto,q_auto/');
  }
  
  const bedrooms = property.bedrooms || '-';
  const bathrooms = property.bathrooms || '-';
  const area = property.area ? (Number(property.area) / 4).toFixed(1) : '-';
  const priceFormatted = formatPrice(property.price, property.isRental);
  const statusLabel = property.status === 'available' ? 'ว่าง' : (property.status === 'reserved' ? 'ติดจอง' : 'ขายแล้ว');
  const robots = property.status === 'available' ? 'index, follow' : 'noindex, follow';
  const createdAt = property.createdAt?.seconds ? new Date(property.createdAt.seconds * 1000).toISOString() : new Date().toISOString();
  const images = property.images || [];
  
  // Build gallery thumbnails HTML
  const thumbnailsHtml = images.slice(1, 6).map(img => 
    `<img src="${img}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;" loading="lazy" alt="thumbnail">`
  ).join('');
  
  // Build images array for JSON-LD
  const imagesJson = JSON.stringify(images.length > 0 ? images : [primaryImage]);

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph - LINE & Facebook -->
  <meta property="og:title" content="${escapeHtml(property.title || '')}">
  <meta property="og:description" content="${escapeHtml(description.slice(0, 100))}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${primaryImage}">
  <meta property="og:image:secure_url" content="${primaryImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:locale" content="th_TH">
  <meta property="og:site_name" content="SPS Property Solution">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(property.title || '')}">
  <meta name="twitter:description" content="${escapeHtml(description.slice(0, 100))}">
  <meta name="twitter:image" content="${primaryImage}">
  
  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": "${escapeHtml(property.title || '')}",
    "description": "${escapeHtml(property.description || '')}",
    "image": ${imagesJson},
    "url": "${canonicalUrl}",
    "datePosted": "${createdAt}",
    "offers": {
      "@type": "Offer",
      "price": ${property.price || 0},
      "priceCurrency": "THB",
      "availability": "${property.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut'}"
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "${escapeHtml(loc.district || '')}",
      "addressRegion": "${escapeHtml(loc.province || '')}",
      "addressCountry": "TH"
    }
  }
  </script>
  
  <style>
    /* CSS Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
    
    /* Layout */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
    .py-8 { padding: 32px 0; }
    .grid { display: grid; gap: 32px; }
    @media (min-width: 1024px) { .lg\\:grid-cols-3 { grid-template-columns: 2fr 1fr; } }
    
    /* Header */
    .hero { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 16px; text-align: center; color: white; margin-bottom: 32px; }
    .hero h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    .hero p { opacity: 0.9; }
    
    /* Card */
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .card-padded { padding: 24px; }
    .bordered { border: 1px solid #e2e8f0; }
    
    /* Image */
    .img-full { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .thumbnails { display: flex; gap: 8px; padding: 8px; overflow-x: auto; }
    .thumbnail { width: 80px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    
    /* Typography */
    h1 { font-size: 28px; font-weight: 700; color: #1e3a8a; margin-bottom: 12px; line-height: 1.3; }
    .price { font-size: 32px; font-weight: 700; color: #059669; margin-bottom: 16px; }
    .text-lg { font-size: 18px; }
    .text-sm { font-size: 14px; }
    .text-gray { color: #64748b; }
    .mb-4 { margin-bottom: 16px; }
    .mb-6 { margin-bottom: 24px; }
    
    /* Badges */
    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .badge { padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    
    /* Specs */
    .specs { display: flex; flex-wrap: wrap; gap: 16px; padding: 16px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin: 16px 0; }
    .spec { display: flex; align-items: center; gap: 6px; }
    
    /* Description */
    .desc { white-space: pre-wrap; line-height: 1.8; }
    
    /* Sidebar */
    .sidebar { display: flex; flex-direction: column; gap: 24px; }
    @media (min-width: 1024px) { .sticky { position: sticky; top: 96px; } }
    .btn { display: block; width: 100%; padding: 12px 24px; background: #1e40af; color: white; text-align: center; border-radius: 8px; font-weight: 600; text-decoration: none; }
    .btn:hover { background: #1e3a8a; }
    
    /* Footer */
    footer { background: #1e293b; color: white; padding: 32px 16px; text-align: center; margin-top: 64px; }
    footer a { color: white; }
    
    /* Mobile */
    @media (max-width: 640px) {
      h1 { font-size: 22px; }
      .price { font-size: 26px; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="hero">
    <h1>🏠 ${escapeHtml(property.title || '')}</h1>
    <p>📍 ${escapeHtml(locationDisplay)}</p>
  </div>
  
  <!-- Main Content -->
  <main class="container py-8">
    <div class="grid lg:grid-cols-3">
      <!-- Left Column -->
      <div style="grid-column: span 2;">
        <!-- Image -->
        <div class="card mb-6">
          <img src="${primaryImage}" alt="${escapeHtml(property.title || 'Property')}" class="img-full" loading="eager">
          ${thumbnailsHtml ? `<div class="thumbnails">${thumbnailsHtml}</div>` : ''}
        </div>
        
        <!-- Info Card -->
        <div class="card card-padded bordered">
          <!-- Badges -->
          <div class="badges">
            ${property.propertyId ? `<span class="badge badge-blue" style="font-family: monospace;">${escapeHtml(property.propertyId)}</span>` : ''}
            <span class="badge badge-blue">${property.isRental ? 'เช่า' : 'ซื้อ'}</span>
            <span class="badge ${property.status === 'available' ? 'badge-green' : 'badge-amber'}">${statusLabel}</span>
          </div>
          
          <h1>${escapeHtml(property.title || '')}</h1>
          <p class="price">฿${priceFormatted.replace('฿', '')}</p>
          
          <p class="text-lg text-gray mb-6">📍 ${escapeHtml(locationDisplay)}</p>
          
          <div class="specs">
            <span class="spec">🛏️ ${bedrooms} ห้องนอน</span>
            <span class="spec">🛁 ${bathrooms} ห้องน้ำ</span>
            <span class="spec">📐 ${area} ตร.ว.</span>
          </div>
          
          ${property.description ? `<p class="desc text-gray">${escapeHtml(property.description)}</p>` : ''}
        </div>
      </div>
      
      <!-- Right Column (Sidebar) -->
      <div class="sidebar sticky">
        <div class="card card-padded">
          <h3 class="text-lg font-bold mb-4" style="color: #1e3a8a;">📞 ติดต่อสอบถาม</h3>
          <a href="${canonicalUrl}" class="btn">ดูรายละเอียดเพิ่มเติม →</a>
        </div>
        
        <div class="card card-padded">
          <h3 class="text-lg font-bold mb-4" style="color: #1e3a8a;">🏠 ทรัพย์อื่นๆ</h3>
          <a href="/properties" style="color: #3b82f6; text-decoration: none; font-weight: 500;">ดูทรัพย์ทั้งหมด →</a>
        </div>
      </div>
    </div>
  </main>
  
  <!-- Footer -->
  <footer>
    <p>© 2026 <a href="https://spspropertysolution.com">SPS Property Solution</a></p>
  </footer>
  
  <!-- Data for potential hydration -->
  <script>
    window.__PROPERTY_DATA__ = ${JSON.stringify(property)};
    window.__PROPERTY_SLUG__ = '${slug}';
  </script>
</body>
</html>`;
}

async function generateStaticPages(properties) {
  const distDir = path.join(__dirname, '..', 'dist');
  const propertiesDir = path.join(distDir, 'properties');
  
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  if (!fs.existsSync(propertiesDir)) fs.mkdirSync(propertiesDir, { recursive: true });
  
  console.log(`\n📄 Generating ${properties.length} static pages...`);
  
  let generated = 0;
  for (const property of properties) {
    try {
      const slug = generatePropertySlug(property);
      const html = generatePropertyHTML(property);
      const propertyDir = path.join(propertiesDir, slug);
      fs.mkdirSync(propertyDir, { recursive: true });
      fs.writeFileSync(path.join(propertyDir, 'index.html'), html);
      generated++;
      if (generated % 50 === 0) console.log(`   Progress: ${generated}/${properties.length}`);
    } catch (error) {
      console.error(`   ❌ Error: ${property.id}`, error.message);
    }
  }
  
  console.log(`\n✅ Generated ${generated} pages`);
  return generated;
}

async function main() {
  console.log('🏠 SPS Property - SSG Generator');
  console.log('================================\n');
  
  initFirebase();
  const properties = await fetchProperties();
  await generateStaticPages(properties);
  console.log('\n✨ Done!');
}

main().catch(console.error);
