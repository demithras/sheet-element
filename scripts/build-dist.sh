#!/bin/sh
# Rebuilds dist/sheet-element.min.js and dist/sheet-element.min.css from src/ and styles/.
# Needs Node.js (for npx). The component itself needs no build step; this only makes the optional single-file copy.
set -e
cd "$(dirname "$0")/.."
ESBUILD="npx --yes esbuild@0.28.2"
BANNER='/*! sheet-element | Apache-2.0 | https://github.com/demithras/sheet-element | includes code derived from React Aria (Copyright Adobe, Apache-2.0), see NOTICE */'
$ESBUILD src/index.js --bundle --minify --format=esm --target=es2022 --banner:js="$BANNER" --outfile=dist/sheet-element.min.js --log-level=warning
printf '@import "./styles/theme.css";\n@import "./styles/Sheet.css";\n@import "./src/sheet.css";\n' |
  $ESBUILD --bundle --loader=css --minify --banner:css="$BANNER" --outfile=dist/sheet-element.min.css --log-level=warning
