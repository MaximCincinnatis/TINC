#!/bin/bash
# IndexNow ping (2026-09-02 SEO pass): tells Bing, Yandex and the other IndexNow engines that the
# site's pages changed, so ChatGPT/Copilot (Bing index) see the current page within hours instead
# of whenever the crawler comes back. Google does not use IndexNow; that stays Search Console.
#
# Submits every <loc> in the live sitemap in one POST. Run after a frontend deploy, and once a
# day from cron (the verdict and the figures change daily). The key is proven by the file
# public/<key>.txt, which Vercel serves at https://www.tincburn.fyi/<key>.txt.
#
# Responses: 200 ok · 202 accepted (key still being validated) · 422 bad url/key · 429 slow down
set -u
HOST="www.tincburn.fyi"
KEY="2c0a19186d1aa3ac1e0eeb0fa15c534d"
URLS=$(curl -s -m 20 "https://$HOST/sitemap.xml" | grep -oE '<loc>[^<]+' | sed 's/<loc>//' | sed 's/^/"/;s/$/"/' | paste -sd, -)
[ -z "$URLS" ] && URLS="\"https://$HOST/\""
BODY="{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":[$URLS]}"
CODE=$(curl -s -m 30 -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json; charset=utf-8' -d "$BODY" https://api.indexnow.org/indexnow)
echo "$(date -u +%FT%TZ) indexnow http=$CODE urls=[$URLS]"
