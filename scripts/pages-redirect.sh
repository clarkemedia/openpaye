#!/usr/bin/env bash
# Builds a set of redirect pages for GitHub Pages: every old address on
# https://<owner>.github.io/<repo>/ sends visitors to the same page on the live site,
# keeping any calculation in the address (#c=…). Usage: pages-redirect.sh <site-url> <repo-name> <out-dir>
set -euo pipefail
SITE=$1 REPO=$2 OUT=$3
mkdir -p "$OUT/employer-cost"

page() { # $1 = path on the live site, used when JavaScript is off
  cat <<HTML
<!doctype html>
<html lang="en-IE">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>OpenPAYE has moved to ${SITE#https://}</title>
<link rel="canonical" href="$SITE/$1" />
<meta http-equiv="refresh" content="0; url=$SITE/$1" />
<script>location.replace('$SITE/' + location.pathname.replace(/^\/$REPO(\/|$)/, '') + location.search + location.hash);</script>
</head>
<body style="font-family: system-ui, sans-serif; padding: 24px">
<p>OpenPAYE has moved to <a href="$SITE/$1">${SITE#https://}</a>.</p>
</body>
</html>
HTML
}

page '' > "$OUT/index.html"
page 'employer-cost/' > "$OUT/employer-cost/index.html"
page 'embed.html' > "$OUT/embed.html"
# GitHub Pages serves 404.html for any other address, so this catches everything else
page '' > "$OUT/404.html"
# Sites using the old widget address get the live widget
printf "(function(){var s=document.createElement('script');s.src='%s/widget.js';s.defer=true;document.head.appendChild(s)})();\n" "$SITE" > "$OUT/widget.js"
touch "$OUT/.nojekyll"
