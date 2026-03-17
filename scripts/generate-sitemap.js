#!/usr/bin/env node
/**
 * Dynamic Sitemap Generator
 * 
 * Usage:
 * 1. Set Firebase environment variables:
 *    export VITE_FIREBASE_PROJECT_ID=your-project-id
 *    export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
 * 
 * 2. Run: npm run generate-sitemap
 * 
 * Note: Requires Firebase Admin SDK setup. For now, manually add URLs below.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://spspropertysolution.com';
const TODAY = new Date().toISOString().split('T')[0];

// Static URLs - หน้าหลัก
const staticUrls = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/properties', changefreq: 'daily', priority: '0.9' },
  { loc: '/blogs', changefreq: 'weekly', priority: '0.8' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
  { loc: '/loan-service', changefreq: 'monthly', priority: '0.6' },
];

// Dynamic URLs - Properties (เพิ่มจาก Firebase หรือ manual)
// Format: { loc: '/properties/สัตหีบ-ชลบุรี-ทาวน์โฮม-1-ชั้น-ขาย-1.6m--EmNoXkv9iCIHbiSs0TA3', lastmod: '2025-03-16', priority: '0.8' }
const propertyUrls = [
  // ตัวอย่าง: เพิ่ม URL ของ properties ที่สำคัญ
  // { loc: '/properties/สัตหีบ-ชลบุรี-ทาวน์โฮม-1-ชั้น-ขาย-1.6m--EmNoXkv9iCIHbiSs0TA3', lastmod: TODAY, changefreq: 'weekly', priority: '0.8' },
];

// Dynamic URLs - Blogs (เพิ่มจาก Firebase หรือ manual)
const blogUrls = [
  // ตัวอย่าง: เพิ่ม URL ของ blogs ที่สำคัญ
  // { loc: '/blogs/ชื่อบทความ--id', lastmod: TODAY, changefreq: 'weekly', priority: '0.7' },
];

function generateSitemap() {
  const allUrls = [...staticUrls, ...propertyUrls, ...blogUrls];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<!-- Generated: ${new Date().toISOString()} -->\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n`;
  
  // Static pages
  sitemap += `  <!-- Static Pages -->\n`;
  for (const url of staticUrls) {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${BASE_URL}${url.loc}</loc>\n`;
    sitemap += `    <lastmod>${TODAY}</lastmod>\n`;
    sitemap += `    <changefreq>${url.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${url.priority}</priority>\n`;
    sitemap += `  </url>\n`;
  }
  
  // Properties
  if (propertyUrls.length > 0) {
    sitemap += `\n  <!-- Properties -->\n`;
    for (const url of propertyUrls) {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${BASE_URL}${url.loc}</loc>\n`;
      sitemap += `    <lastmod>${url.lastmod}</lastmod>\n`;
      sitemap += `    <changefreq>${url.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${url.priority}</priority>\n`;
      sitemap += `  </url>\n`;
    }
  }
  
  // Blogs
  if (blogUrls.length > 0) {
    sitemap += `\n  <!-- Blogs -->\n`;
    for (const url of blogUrls) {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${BASE_URL}${url.loc}</loc>\n`;
      sitemap += `    <lastmod>${url.lastmod}</lastmod>\n`;
      sitemap += `    <changefreq>${url.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${url.priority}</priority>\n`;
      sitemap += `  </url>\n`;
    }
  }
  
  sitemap += `\n</urlset>\n`;
  
  // Write file
  const publicDir = path.join(__dirname, '..', 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  
  fs.writeFileSync(sitemapPath, sitemap);
  
  console.log('✅ Sitemap generated successfully!');
  console.log(`📊 Total URLs: ${allUrls.length}`);
  console.log(`   - Static: ${staticUrls.length}`);
  console.log(`   - Properties: ${propertyUrls.length}`);
  console.log(`   - Blogs: ${blogUrls.length}`);
  console.log(`📄 Saved to: ${sitemapPath}`);
  console.log('\n💡 To add dynamic URLs:');
  console.log('   1. Edit scripts/generate-sitemap.js');
  console.log('   2. Add URLs to propertyUrls or blogUrls arrays');
  console.log('   3. Run: npm run generate-sitemap');
}

generateSitemap();
