#!/usr/bin/env bash
# Package the extension from src/ into dist/:
#   dist/docusave-v<version>.zip   Chrome / Brave / Edge (extract, load unpacked)
#   dist/docusave-v<version>.xpi   Firefox (same archive; unsigned until
#                                     scripts/sign-firefox.sh or the release
#                                     workflow signs it)
#
# Usage: npm run build      (or: bash scripts/build.sh)
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./src/manifest.json').version")"
OUT="dist"
mkdir -p "$OUT"
rm -f "$OUT"/docusave-v"$VERSION".zip "$OUT"/docusave-v"$VERSION".xpi

# web-ext validates the manifest and excludes editor junk for us.
npx --yes web-ext build \
  --source-dir=src \
  --artifacts-dir="$OUT" \
  --filename="docusave-v${VERSION}.zip" \
  --overwrite-dest

cp "$OUT/docusave-v${VERSION}.zip" "$OUT/docusave-v${VERSION}.xpi"

echo
echo "Built:"
ls -1 "$OUT"/docusave-v"$VERSION".*
