#!/usr/bin/env bash
#
# Turns the screencast frames written by capture.mjs into the README's demo GIF.
#
#   bash scripts/capture/build-gif.sh
#
# Requires ffmpeg on PATH (https://ffmpeg.org/download.html). The PowerShell
# equivalent is documented in docs/assets/README.md.
#
# mpdecimate drops near-duplicate frames (idle UI between actions), the scale
# filter keeps the width readable, and palettegen/paletteuse produce a proper
# 256-colour GIF instead of the dithered mess a naive conversion gives.
#
#   RATE  — input frame rate; raising it shortens the GIF (the tour is ~45 s
#           of real time, and 24 turns it into ~42 s of playback)
#   WIDTH — output width in pixels
#   FPS   — output frame rate

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMES="${HERE}/.frames"
OUT="${HERE}/../../docs/assets/demo.gif"
RATE="${RATE:-24}"
WIDTH="${WIDTH:-880}"
FPS="${FPS:-12}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "✗ ffmpeg not found on PATH — https://ffmpeg.org/download.html" >&2
  exit 1
fi

if [ ! -d "${FRAMES}" ]; then
  echo "✗ ${FRAMES} not found — run 'node scripts/capture/capture.mjs' first." >&2
  exit 1
fi

COUNT="$(find "${FRAMES}" -name '*.jpg' | wc -l | tr -d ' ')"
if [ "${COUNT}" -lt 10 ]; then
  echo "✗ only ${COUNT} frames captured — the tour did not run." >&2
  exit 1
fi

echo "· ${COUNT} frames → ${OUT} (${WIDTH}px, ${FPS}fps, input ${RATE}fps)"

ffmpeg -y -framerate "${RATE}" -i "${FRAMES}/%04d.jpg" \
  -vf "mpdecimate=hi=64*20:lo=64*8:frac=0.45,scale=${WIDTH}:-1:flags=lanczos,fps=${FPS},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 "${OUT}"

SIZE="$(du -h "${OUT}" | cut -f1)"
echo "✓ docs/assets/demo.gif (${SIZE})"

# GitHub renders a ~8 MB GIF comfortably; larger files make the README page
# sluggish, so fail loudly instead of shipping something unusable.
BYTES="$(wc -c < "${OUT}" | tr -d ' ')"
if [ "${BYTES}" -gt 8388608 ]; then
  echo "⚠ ${SIZE} is over 8 MB — re-encode smaller: WIDTH=700 RATE=30 bash scripts/capture/build-gif.sh" >&2
fi
