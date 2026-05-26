#!/usr/bin/env bash
set -e

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "==> Running PHP tests inside php:8.1-cli container"
echo ""

docker run --rm \
  -v "$PLUGIN_DIR:/app" \
  -w /app \
  php:8.1-cli \
  sh -c '
    echo "--> Installing system dependencies..."
    apt-get update -qq && apt-get install -y -qq unzip curl 2>/dev/null
    if [ ! -f composer.phar ]; then
      echo "--> Downloading Composer..."
      curl -sS https://getcomposer.org/installer | php -- --quiet
    fi
    echo "--> Installing PHP dependencies..."
    php composer.phar install --no-interaction
    echo "--> Running PHPUnit..."
    vendor/bin/phpunit
  '
