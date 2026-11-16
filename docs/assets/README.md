# README assets

The images in the root [`README.md`](../../README.md) are **captured from the deployed
site**, not mocked up, so they show the product a visitor actually gets.

| File | What it shows |
|------|---------------|
| `demo.gif` | The scripted tour: landing → sign-in → dashboard → a grounded answer with citations → a chat reply streaming in |
| `landing.png` | The public landing page, signed out |
| `dashboard.png` | The signed-in home dashboard — streak, tokens, cost, the daily budget meter, the 14-day activity chart |
| `grounded-answer.png` | An explanation answered from the uploaded notes, with the **SOURCES** panel in view |
| `chat-stream.png` | A chat reply captured mid-stream, while tokens are still arriving |
| `sample-notes.txt` | The study notes uploaded to the demo account, so the grounded answer has something real to cite |

## Regenerating them

The capture is a committed script, so the images are reproducible rather than mystery
binaries. It needs **no new dependencies**: Node 24's global `WebSocket` talks to
Chrome's DevTools Protocol, and ffmpeg assembles the GIF.

```bash
# 1. Chrome must be installed (the script also finds Edge).
# 2. The demo account's credentials:
export DEMO_USER=studybuddy_demo
export DEMO_PASSWORD=...

# 3. Capture the stills and the tour
node scripts/capture/capture.mjs

# 4. Build the GIF from the captured frames
bash scripts/capture/build-gif.sh
```

On Windows (PowerShell), step 4 is:

```powershell
ffmpeg -y -framerate 24 -i scripts/capture/.frames/%04d.jpg `
  -vf "mpdecimate=hi=64*20:lo=64*8:frac=0.45,scale=880:-1:flags=lanczos,fps=12,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" `
  -loop 0 docs/assets/demo.gif
```

`scripts/capture/.frames/` and `scripts/capture/.chrome-profile/` are gitignored — they
are scratch output, rebuilt on every run.

### Environment knobs

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEMO_USER` / `DEMO_PASSWORD` | — | Required. The account the capture signs in with. |
| `SITE_URL` | `https://studybuddy-omega-gray.vercel.app` | The deployed frontend. |
| `API_URL` | `https://studybuddy-api-hkgx.onrender.com/api` | The deployed API. |
| `CHROME_PATH` | auto-detected | Path to Chrome or Edge. |
| `ONLY` | — | `stills` to skip the GIF, `gif` to skip the stills. |
| `VIEWPORT` | `1440x900` | Capture size. |
| `DEMO_TOPIC` / `DEMO_QUESTION` | photosynthesis prompts | What the grounded answer and the chat ask. |
| `WIDTH` / `FPS` / `RATE` (build-gif.sh) | `880` / `12` / `24` | GIF width, output frame rate, and input frame rate (raising `RATE` shortens the GIF). |

### Notes from the capture

- **The capture spends almost no provider tokens.** The script first calls
  `POST /api/generate/` with the exact topic, level and document the browser will use,
  so the browser's own request is a **response-cache hit** — the answer and its
  citations render instantly and cost 0 tokens. Only the streamed chat turn reaches
  the provider, because chat is never cached.
- **The demo account has a daily budget** (10,000 tokens). Repeated captures add up;
  when `/api/usage/` reports the cap reached, the app answers **429** and the capture
  cannot continue until the budget resets at midnight UTC.
- **CSS `uppercase` matters when asserting on the DOM.** The sources heading is
  rendered with `text-transform: uppercase`, so `innerText` reads `SOURCES (1)` — a
  check for `Sources (` never matches.
- **Render's free tier sleeps.** The first request after 15 idle minutes can take a
  minute, so every call uses a generous timeout and one retry.
- **A screenshot must never show a spinner.** The script waits for the dashboard's
  setup panel to finish loading and for the citations panel to exist before it
  captures.
