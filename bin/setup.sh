#!/usr/bin/env bash
set -e

echo ""
echo "==> Guidwell dev environment setup"
echo ""

WP_ENV="npx wp-env run cli wp"

# Check if demo page already exists via a stored option flag
ALREADY_SETUP=$($WP_ENV option get guidwell_dev_setup 2>/dev/null || echo "")

if [ -n "$ALREADY_SETUP" ]; then
  echo "Already set up. Demo page: http://localhost:8888/?page_id=$ALREADY_SETUP"
  echo "Admin:  http://localhost:8888/wp-admin  (admin / password)"
  echo ""
  exit 0
fi

echo "--> Setting site title..."
$WP_ENV option update blogname "Guidwell Dev"
$WP_ENV option update blogdescription ""

echo "--> Creating demo page with [guidwell] shortcode..."
PAGE_ID=$($WP_ENV post create \
  --post_type=page \
  --post_title="Guidwell Demo" \
  --post_name=guidwell-demo \
  --post_content="[guidwell]" \
  --post_status=publish \
  --porcelain)

echo "--> Setting demo page as front page..."
$WP_ENV option update show_on_front page
$WP_ENV option update page_on_front "$PAGE_ID"

echo "--> Flushing rewrite rules..."
$WP_ENV rewrite flush

# Store the page ID so this script is idempotent on re-runs
$WP_ENV option add guidwell_dev_setup "$PAGE_ID"

echo ""
echo "==> Setup complete!"
echo ""
echo "    Site:   http://localhost:8888"
echo "    Admin:  http://localhost:8888/wp-admin"
echo "    Login:  admin / password"
echo ""
