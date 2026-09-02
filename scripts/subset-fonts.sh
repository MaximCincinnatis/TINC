#!/bin/bash
# Builds the self-hosted font subsets in public/fonts (2026-09-02).
#
# The site's three faces used to come from a Google Fonts @import in src/index.css. That was a
# 143 KB render-blocking stylesheet (Zen Maru Gothic ships ~120 unicode-range slices per weight)
# at the end of a CSS -> @import -> font chain, and it cost phones about four seconds before the
# first paint. This script cuts each face down to Latin, punctuation and every kanji the site
# renders, and packs it as woff2 (~20-30 KB per face and weight, ~240 KB for all nine).
#
# Sources: the google/fonts repository (OFL). Tooling: fonttools + brotli in a venv.
#
#   python3 -m venv ~/pt-lab/fontenv && ~/pt-lab/fontenv/bin/pip install fonttools brotli
#   scripts/subset-fonts.sh            (from the repo root; writes public/fonts/*.woff2)
#
# Re-run whenever a new kanji appears in src/ (a new eyebrow, tier or label): the KANJI set is
# read from the source tree, so the new glyph is picked up automatically. Glyphs a face never had
# (Zen Maru Gothic has no ū ō) fall back to the system font exactly as they did with Google's CSS.
set -e
VENV=${FONT_VENV:-$HOME/pt-lab/fontenv}
PYFT="$VENV/bin/pyftsubset"; [ -x "$PYFT" ] || { echo "pyftsubset not found in $VENV (see header)"; exit 1; }
SRC=${FONT_SRC:-$HOME/pt-lab/fonts}; mkdir -p "$SRC"
OUT=public/fonts; mkdir -p "$OUT"
GF=https://raw.githubusercontent.com/google/fonts/main
declare -A FILES=(
  [dela-gothic-one.woff2]=ofl/delagothicone/DelaGothicOne-Regular.ttf
  [zen-maru-gothic-400.woff2]=ofl/zenmarugothic/ZenMaruGothic-Regular.ttf
  [zen-maru-gothic-500.woff2]=ofl/zenmarugothic/ZenMaruGothic-Medium.ttf
  [zen-maru-gothic-700.woff2]=ofl/zenmarugothic/ZenMaruGothic-Bold.ttf
  [zen-maru-gothic-900.woff2]=ofl/zenmarugothic/ZenMaruGothic-Black.ttf
  [ibm-plex-mono-400.woff2]=ofl/ibmplexmono/IBMPlexMono-Regular.ttf
  [ibm-plex-mono-500.woff2]=ofl/ibmplexmono/IBMPlexMono-Medium.ttf
  [ibm-plex-mono-600.woff2]=ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf
  [ibm-plex-mono-700.woff2]=ofl/ibmplexmono/IBMPlexMono-Bold.ttf
)
# Every kanji in the source tree plus the ones rendered from data files, so nothing falls back.
KANJI=$(python3 -c "
import re, glob
chars = set()
for f in glob.glob('src/**/*.*', recursive=True) + ['public/llms.txt']:
    try: chars.update(re.findall(r'[　-ヿ一-鿿]', open(f, encoding='utf-8').read()))
    except Exception: pass
chars.update('解説問答今龍階炎位例概要供給燃焼')
print(''.join(sorted(chars)))")
UNI='U+0020-007E,U+00A0-00FF,U+0100-017F,U+02C6-02DC,U+2000-206F,U+20A0-20CF,U+2122,U+2190-21FF,U+2200-22FF,U+25A0-25FF,U+3000-303F'
echo "kanji: $KANJI"
for out in "${!FILES[@]}"; do
  ttf="$SRC/$(basename "${FILES[$out]}")"
  [ -s "$ttf" ] || curl -sL -o "$ttf" "$GF/${FILES[$out]}"
  "$PYFT" "$ttf" --output-file="$OUT/$out" --flavor=woff2 --layout-features='*' --unicodes="$UNI" --text="$KANJI" 2>/dev/null
  printf '%-28s %7d B\n' "$out" "$(wc -c < "$OUT/$out")"
done
