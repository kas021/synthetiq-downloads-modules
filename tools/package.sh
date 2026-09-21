#!/usr/bin/env bash
# Package a module source dir (src/<name>/module.json + index.js) into a flat
# ZIP under modules/<name>-<version>.zip, exactly as the catalogue expects.
set -euo pipefail
name="${1:-}"
[ -n "$name" ] || { echo "usage: tools/package.sh <Synthetiq-Anime|Synthetiq-Movies>"; exit 2; }
dir="src/$name"
[ -f "$dir/module.json" ] || { echo "missing $dir/module.json"; exit 1; }
ver=$(python3 -c "import json;print(json.load(open('$dir/module.json'))['moduleVersion'])")
out="$(pwd)/modules/$name-$ver.zip"
rm -f "$out"
(cd "$dir" && zip -X -q "$out" module.json index.js)
echo "packaged: modules/$name-$ver.zip ($(stat -f%z "$out") bytes)"
