#!/usr/bin/env sh
# First-time setup: builds the images and creates .env with fresh secrets.
# Usage: ./scripts/setup.sh [api-url] [console-url]
#   e.g. ./scripts/setup.sh https://api.example.com https://console.example.com
set -eu
cd "$(dirname "$0")/.."

PUBLIC_URL="${1:-http://localhost:3000}"
CONSOLE_URL="${2:-http://localhost:3001}"

if [ -f .env ]; then
  echo ".env already exists, so its secrets are kept. Replacing them would lock out every connector and webhook."
else
  docker build --target cloud -t hexspare/tally-cloud:latest .
  umask 077
  {
    docker run --rm --entrypoint node hexspare/tally-cloud:latest cloud.mjs keygen
    echo "PUBLIC_URL=$PUBLIC_URL"
    echo "CONSOLE_URL=$CONSOLE_URL"
    case "$PUBLIC_URL" in
      https://*) echo "DOMAIN=$(echo "$PUBLIC_URL" | sed -e 's|^https://||' -e 's|/.*$||')" ;;
    esac
    case "$CONSOLE_URL" in
      https://*) echo "CONSOLE_DOMAIN=$(echo "$CONSOLE_URL" | sed -e 's|^https://||' -e 's|/.*$||')" ;;
    esac
  } > .env
  echo "Created .env. Back it up somewhere safe: SIGNING_PRIVATE_KEY and SECRETS_KEY cannot be recovered."
fi
docker compose --profile demo --profile tls build
echo
echo "Next:"
case "$PUBLIC_URL" in
  https://*) echo "  docker compose --profile tls up -d" ;;
  *)         echo "  docker compose up -d" ;;
esac
echo '  docker compose run --rm api seed "Your company" "Your app"   (prints your first API key)'
