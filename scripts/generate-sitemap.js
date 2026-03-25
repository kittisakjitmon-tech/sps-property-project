#!/usr/bin/env node
/**
 * Generate Sitemap for all properties
 * 
 * Usage:
 *   npm run generate:sitemap
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    }
  } catch (error) {
    console.error('❌ Firebase init error:', error.message);
  }
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

function generatePropertySlug(property) {
  if (!property?.id) return '';
  const parts = [];
  const loc = property.location || {};
  if (loc.district) parts.push(sanitizeSlug(loc.district));
  if (loc.province) parts.push(sanitizeSlug(loc.province));
  if (property.type) parts.push(sanitizeSlug(property.type));
  parts.push(property.isRental ? 'เช่า' : 'ขาย');
  const priceSlug = formatPriceForSlug(property.price);
  if (priceSlug) parts.push(priceSlug);
  const body = parts.filter(Boolean).join('-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return body ? `${body}--${property.id}` : `property--${property.id}`;
}

async function fetchProperties() {
  const db = admin.firestore();
  const snapshot = await db.collection('properties').get();
  const properties = [];
  snapshot.forEach(doc => properties.push({ id: doc.id, ...doc.data() }));
  console.log(`✅ Found ${properties.length} properties`);
  return properties;
}

function generateSitemap(properties) {
  const today = new Date().toISOString().split('T')[0];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<!-- Generated: ${new Date().toISOString()} -->\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Static pages
  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/properties', changefreq: 'daily', priority: '0.9' },
    { loc: '/blogs', changefreq: 'weekly', priority: '0.8' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
    { loc: '/loan-service', changefreq: 'monthly', priority: '0.6' },
  ];
  
  sitemap += `\n  <!-- Static Pages -->\n`;
  for (const page of staticPages) {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${BASE_URL}${page.loc}</loc>\n`;
    sitemap += `    <lastmod>${today}</lastmod>\n`;
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${page.priority}</priority>\n`;
    sitemap += `  </url>\n`;
  }
  
  // Property pages
  sitemap += `\n  <!-- Property Pages -->\n`;
  for (const property of properties) {
    const slug = generatePropertySlug(property);
    const propertyUrl = `${BASE_URL}/properties/${encodeURIComponent(slug)}`;
    const lastmod = property.updatedAt?.seconds 
      ? new Date(property.updatedAt.seconds * 1000).toISOString().split('T')[0] 
      : today;
    
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${propertyUrl}</loc>\n`;
    sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
    sitemap += `    <changefreq>weekly</changefreq>\n`;
    sitemap += `    <priority>${property.status === 'available' ? '0.8' : '0.3'}</priority>\n`;
    sitemap += `  </url>\n`;
  }
  
  sitemap += `\n</urlset>\n`;
  
  return sitemap;
}

async function main() {
  console.log('📋 Generating Sitemap...');
  console.log('========================\n');
  
  initFirebase();
  const properties = await fetchProperties();
  
  const sitemap = generateSitemap(properties);
  
  // Write to public/sitemap.xml
  const publicDir = path.join(__dirname, '..', 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  
  console.log(`\n✅ Sitemap generated!`);
  console.log(`📊 Total URLs: ${properties.length + 5}`);
  console.log(`   - Static: 5`);
  console.log(`   - Properties: ${properties.length}`);
  console.log(`📄 Saved to: ${sitemapPath}`);
}

main().catch(console.error);
