#!/usr/bin/env node
/**
 * SSG (Static Site Generation) for Property Detail Pages
 * Hybrid: Static HTML + React Hydration
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

const admin = require('firebase-admin');
const BASE_URL = 'https://spspropertysolution.com';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'firebase-service-account.json');

function initFirebase() {
  try {
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('✅ Firebase Admin initialized');
    }
  } catch (error) {
    console.error('❌ Firebase init error:', error.message);
  }
}

async function fetchProperties() {
  const snapshot = await admin.firestore().collection('properties').get();
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
  if (num >= 1_000_000) {
    // Always use 2 decimal places for millions
    const m = (num / 1_000_000).toFixed(2);
    // Remove trailing zeros
    return `${parseFloat(m)}m`;
  }
  if (num >= 1_000) {
    const k = (num / 1_000).toFixed(1);
    return `${parseFloat(k)}k`;
  }
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
  
  let primaryImage = property.coverImageUrl || (property.images && property.images[0]) || '';
  if (primaryImage.includes('res.cloudinary.com')) {
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
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(property.title || '')}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${primaryImage}">
  <meta property="og:image:secure_url" content="${primaryImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="th_TH">
  <meta property="og:site_name" content="SPS Property Solution">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(property.title || '')}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
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
  
  <!-- React CSS for exact same styling -->
  <link rel="stylesheet" href="/assets/index-CGE1MaQk.css">
  <link rel="stylesheet" href="/assets/vendor-cBjhr8kb.css">
</head>
<body class="min-h-screen bg-slate-50">
  <div id="root">
    <!-- Hero Header -->
    <div class="bg-blue-900 text-white py-8 px-4 text-center mb-8">
      <h1 class="text-2xl font-bold mb-2">${escapeHtml(property.title || '')}</h1>
      <p class="opacity-90">📍 ${escapeHtml(locationDisplay)}</p>
    </div>
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Image -->
          <div class="bg-white rounded-xl overflow-hidden shadow-md">
            <img 
              src="${primaryImage.replace('/upload/w_1200,h_630,c_fill,f_auto,q_auto/', '/upload/')}" 
              alt="${escapeHtml(property.title || 'Property')}" 
              class="w-full aspect-video object-cover"
              loading="eager"
            >
            ${images.length > 1 ? `
            <div class="flex gap-2 p-2 overflow-x-auto">
              ${images.slice(0, 6).map(img => `<img src="${img}" class="shrink-0 w-20 h-14 rounded-lg object-cover" loading="lazy" alt="">`).join('')}
            </div>` : ''}
          </div>
          
          <!-- Property Info -->
          <div class="bg-white rounded-xl border border-slate-200 p-6">
            <!-- Badges -->
            <div class="flex flex-wrap items-center gap-2 mb-4">
              ${property.propertyId ? `<span class="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-mono">${escapeHtml(property.propertyId)}</span>` : ''}
              <span class="px-3 py-1.5 rounded-full ${property.isRental ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-800'} text-sm font-medium">${property.isRental ? 'เช่า' : 'ซื้อ'}</span>
              <span class="px-3 py-1.5 rounded-full ${property.status === 'available' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'} text-sm font-medium">${statusLabel}</span>
            </div>
            
            <h1 class="text-2xl sm:text-3xl font-bold text-blue-900 mb-4">${escapeHtml(property.title || '')}</h1>
            
            <p class="text-2xl font-bold text-amber-700 mb-4">฿${priceFormatted.replace('฿', '').replace('/', ' / ')}</p>
            
            <div class="flex items-center gap-2 text-gray-600 mb-4">
              <span>📍</span>
              <span>${escapeHtml(locationDisplay)}</span>
            </div>
            
            <div class="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
              <span>🛏️ ${bedrooms} ห้องนอน</span>
              <span>🛁 ${bathrooms} ห้องน้ำ</span>
              <span>📐 ${area} ตร.ว.</span>
            </div>
            
            ${property.description ? `<p class="text-slate-700 leading-relaxed whitespace-pre-wrap">${escapeHtml(property.description)}</p>` : ''}
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="lg:sticky lg:top-24 space-y-6">
          <div class="bg-white rounded-xl border border-blue-100 p-6 shadow-md">
            <h3 class="text-lg font-semibold text-blue-900 mb-4">📞 ติดต่อสอบถาม</h3>
            <a href="${canonicalUrl}" class="block w-full py-3 px-6 bg-blue-900 text-white text-center rounded-lg font-semibold hover:bg-blue-800 transition">
              ดูรายละเอียดเพิ่มเติม →
            </a>
          </div>
          
          <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
            <h3 class="text-lg font-semibold text-blue-900 mb-4">🏠 ทรัพย์อื่นๆ</h3>
            <a href="/properties" class="text-blue-600 hover:underline font-medium">ดูทรัพย์ทั้งหมด →</a>
          </div>
        </div>
      </div>
    </main>
    
    <footer class="bg-slate-900 text-white py-8 text-center mt-16">
      <p>© 2026 <a href="https://spspropertysolution.com" class="underline">SPS Property Solution</a></p>
    </footer>
  </div>
  
  <!-- React for full interactivity (optional - will hydrate if loaded) -->
  <script type="module" crossorigin src="/assets/index-DbsBoOGT.js"></script>
  <script>
    window.__PROPERTY_DATA__ = \${JSON.stringify(property)};
    window.__PROPERTY_SLUG__ = '${slug}';
    window.__CANONICAL_URL__ = '${canonicalUrl}';
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
