import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://spspropertysolution.com';

const urls = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/properties', changefreq: 'daily', priority: '0.9' },
  { loc: '/blogs', changefreq: 'weekly', priority: '0.7' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
  { loc: '/loan-service', changefreq: 'monthly', priority: '0.6' },
  // Property detail pages - will be added dynamically in the future
  // For now, Google will discover them through internal links
];

const today = new Date().toISOString().split('T')[0];

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

for (const url of urls) {
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${BASE_URL}${url.loc}</loc>\n`;
  sitemap += `    <lastmod>${today}</lastmod>\n`;
  sitemap += `    <changefreq>${url.changefreq}</changefreq>\n`;
  sitemap += `    <priority>${url.priority}</priority>\n`;
  sitemap += `  </url>\n`;
}

sitemap += `</urlset>\n`;

const publicDir = path.join(__dirname, '..', 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');

fs.writeFileSync(sitemapPath, sitemap);
console.log(`✅ Sitemap generated with ${urls.length} URLs`);
console.log(`📄 Saved to: ${sitemapPath}`);
console.log('\n💡 Note: Property detail pages will be discovered by Google through internal links and canonical tags.');
