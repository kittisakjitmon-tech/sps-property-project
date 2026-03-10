#!/bin/bash

# ตัวอย่าง: ทะลึ LINE bot user agent เพื่อทดสอบ dynamicMeta response
# ใช้: ./test-line-bot.sh บ้าน-ชลบุรี-บ้าน-ขาย-2.5m--PROPERTY_ID

PROPERTY_SLUG="${1:-test--demo123}"
DOMAIN="https://spspropertysolution.com"
URL="${DOMAIN}/properties/${PROPERTY_SLUG}"

echo "🔍 Testing LINE bot request for: $URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Simulate LINE crawler (must include 'linespider' substring)
curl -A "Mozilla/5.0 (compatible; LineSpider/1.0; +https://developers.line.biz/)" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
  -i "$URL" | head -50

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Check for:"
echo "  • og:image content=\"https://res.cloudinary.com/...\" ✓"
echo "  • og:title, og:description ✓"
echo "  • Content-Type: text/html; charset=utf-8 ✓"
