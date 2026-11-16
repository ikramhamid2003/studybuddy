#!/usr/bin/env node
/**
 * Regenerates the README's screenshots and the demo GIF from the deployed site.
 *
 * Zero dependencies: Node 24 ships a global `WebSocket`, which is all it takes to
 * drive Chrome's DevTools Protocol. Nothing is installed, and `package.json` is not
 * touched.
 *
 * Usage:
 *   DEMO_USER=studybuddy_demo DEMO_PASSWORD=... node scripts/capture/capture.mjs
 *
 * Environment:
 *   DEMO_USER, DEMO_PASSWORD   demo account credentials (required)
 *   SITE_URL                   default https://studybuddy-omega-gray.vercel.app
 *   API_URL                    default https://studybuddy-api-hkgx.onrender.com/api
 *   CHROME_PATH                default: the standard Windows/macOS install paths
 *   ONLY                       "stills" to skip the GIF tour, "gif" to skip the stills
 *   VIEWPORT                   "1440x900" (default)
 *
 * Output:
 *   docs/assets/landing.png, dashboard.png, grounded-answer.png, chat-stream.png
 *   scripts/capture/.frames/NNNN.jpg   (screencast frames -> build-gif.sh)
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile, rm, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "assets");
const FRAME_DIR = path.join(HERE, ".frames");

const SITE_URL = process.env.SITE_URL || "https://studybuddy-omega-gray.vercel.app";
const API_URL = process.env.API_URL || "https://studybuddy-api-hkgx.onrender.com/api";
const USER = process.env.DEMO_USER;
const PASSWORD = process.env.DEMO_PASSWORD;
const ONLY = process.env.ONLY || "";
const [VW, VH] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const TOPIC = process.env.DEMO_TOPIC || "Explain the light-dependent reactions of photosynthesis";
const CHAT_QUESTION =
  process.env.DEMO_QUESTION ||
  // The chat answer is rendered as plain text (whitespace-pre-wrap), so a
  // reply written with markdown shows its asterisks literally. Asking for
  // prose keeps the screenshot clean.
  "In plain prose without markdown, explain how the light reactions and the Calvin cycle work together.";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) if (existsSync(candidate)) return candidate;
  throw new Error(`No Chrome/Edge binary found. Set CHROME_PATH. Tried:\n${CHROME_CANDIDATES.join("\n")}`);
}

// ── HTTP helpers (with the Render free-tier cold start in mind) ─────────────

async function fetchWithRetry(url, options = {}, { attempts = 3, timeoutMs = 120000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`${url} -> HTTP ${response.status}`);
        await sleep(4000 * attempt);
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < attempts) await sleep(4000 * attempt);
    }
  }
  throw lastError;
}

async function login() {
  const response = await fetchWithRetry(`${API_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: PASSWORD }),
  });
  if (!response.ok) {
    throw new Error(
      `Login failed: HTTP ${response.status} ${await response.text()}\n` +
        `Is the demo account created? See docs/assets/README.md.`,
    );
  }
  return response.json();
}

// ── Minimal CDP client ──────────────────────────────────────────────────────

class CDP {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
        else resolve(message.result);
        return;
      }
      const list = this.handlers.get(message.method);
      if (list) for (const handler of list) handler(message.params, message.sessionId);
    });
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  send(method, params = {}, sessionId, timeoutMs = 30000) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
      // A command that never answers must not hang the whole capture: the
      // fonts promise below is a real example.
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);
    });
  }

  close() {
    try {
      this.socket.close();
    } catch {
      /* already closed */
    }
  }
}

// ── Browser / page helpers ──────────────────────────────────────────────────

async function launchChrome() {
  const binary = findChrome();
  const profile = path.join(HERE, ".chrome-profile");
  await rm(profile, { recursive: true, force: true });
  const child = spawn(
    binary,
    [
      "--headless=new",
      // Port 0 lets the OS pick a free port: a fixed one collides with
      // whatever else is listening (the first run of this script failed
      // exactly that way). Chrome writes the chosen port into the profile.
      "--remote-debugging-port=0",
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${profile}`,
      `--window-size=${VW},${VH}`,
      "--hide-scrollbars",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  // Chrome writes "<port>\n<browser ws path>" into <profile>/DevToolsActivePort.
  const portFile = path.join(profile, "DevToolsActivePort");
  let wsUrl = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (existsSync(portFile)) {
      const [port, wsPath] = (await readFile(portFile, "utf8")).split(/\r?\n/);
      if (port && wsPath) {
        wsUrl = `ws://127.0.0.1:${port}${wsPath}`;
        break;
      }
    }
    await sleep(250);
  }
  if (!wsUrl) {
    child.kill();
    throw new Error("Chrome did not expose its DevTools endpoint in time.");
  }
  return { child, wsUrl };
}

class Page {
  constructor(cdp, sessionId) {
    this.cdp = cdp;
    this.sessionId = sessionId;
    this.loaded = null;
    cdp.on("Page.loadEventFired", (_params, sid) => {
      if (sid === this.sessionId && this.loaded) this.loaded();
    });
  }

  send(method, params) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async prepare() {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Network.enable");
    await this.send("Emulation.setDeviceMetricsOverride", {
      width: VW,
      height: VH,
      deviceScaleFactor: 2,
      mobile: false,
    });
  }

  async goto(url, { waitMs = 1200 } = {}) {
    const loaded = new Promise((resolve) => {
      this.loaded = resolve;
    });
    await this.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(30000)]);
    await this.settle(waitMs);
  }

  /** Waits for the network to go quiet and fonts to be ready. */
  async settle(waitMs = 800) {
    try {
      // Bounded: document.fonts.ready never settles if the font CDN stalls.
      await this.send("Runtime.evaluate", {
        expression:
          "Promise.race([document.fonts ? document.fonts.ready.then(() => true) : true, new Promise((r) => setTimeout(() => r(false), 4000))])",
        awaitPromise: true,
      });
    } catch {
      /* fonts API unavailable — carry on */
    }
    await sleep(waitMs);
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression: `(() => { try { return (${expression}); } catch (e) { return null; } })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(`evaluate failed: ${result.exceptionDetails.text}`);
    return result.result?.value;
  }

  /** Polls a JS expression until it is truthy. */
  async waitFor(expression, { timeout = 30000, interval = 250, label = expression } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await this.evaluate(expression);
      if (value) return value;
      await sleep(interval);
    }
    throw new Error(`Timed out waiting for: ${label}`);
  }

  async click(selector) {
    const clicked = await this.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`,
    );
    if (!clicked) throw new Error(`No element for selector: ${selector}`);
    return clicked;
  }

  /** Clicks the first element whose trimmed text contains `text`. */
  async clickByText(text, selector = "button, a, div, span, p") {
    const clicked = await this.evaluate(
      `(() => {
        const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
        const hit = nodes.reverse().find((n) => (n.innerText || "").trim().includes(${JSON.stringify(text)}));
        if (!hit) return false;
        hit.click();
        return true;
      })()`,
    );
    if (!clicked) throw new Error(`No clickable element containing text: ${text}`);
    return clicked;
  }

  /** React-friendly text entry: native setter + input event. */
  async fill(selector, value) {
    const filled = await this.evaluate(
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`,
    );
    if (!filled) throw new Error(`No field for selector: ${selector}`);
    return filled;
  }

  /** Types character by character so the recording shows real typing. */
  async typeInto(selector, value) {
    await this.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el) el.focus(); return !!el; })()`,
    );
    for (const char of value) {
      await this.send("Input.dispatchKeyEvent", { type: "keyDown", text: char, unmodifiedText: char });
      await this.send("Input.dispatchKeyEvent", { type: "keyUp", text: char, unmodifiedText: char });
      await sleep(35);
    }
  }

  async pressEscape() {
    await this.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    });
  }

  async screenshot(file, { fullPage = false } = {}) {
    const params = { format: "png", captureBeyondViewport: fullPage, fromSurface: true };
    if (fullPage) {
      const metrics = await this.send("Page.getLayoutMetrics");
      const { width, height } = metrics.cssContentSize || metrics.contentSize;
      params.clip = { x: 0, y: 0, width, height, scale: 1 };
    }
    const { data } = await this.send("Page.captureScreenshot", params);
    await writeFile(path.join(OUT_DIR, file), Buffer.from(data, "base64"));
    console.log(`  saved docs/assets/${file}`);
  }

  async startScreencast(frames) {
    // Frames are written off the critical path: awaiting a disk write inside
    // the CDP event handler starves the socket, and the responses to
    // Runtime.evaluate then time out while the tour is still running.
    let writeChain = Promise.resolve();
    this.cdp.on("Page.screencastFrame", (params, sid) => {
      if (sid !== this.sessionId) return;
      const index = String(frames.length).padStart(4, "0");
      frames.push(index);
      writeChain = writeChain
        .then(() => writeFile(path.join(FRAME_DIR, `${index}.jpg`), Buffer.from(params.data, "base64")))
        .catch(() => {});
      this.send("Page.screencastFrameAck", { sessionId: params.sessionId }).catch(() => {});
    });
    await this.send("Page.startScreencast", {
      format: "jpeg",
      quality: 78,
      maxWidth: VW,
      maxHeight: VH,
      everyNthFrame: 2,
    });
    this.frameWrites = () => writeChain;
  }

  async stopScreencast() {
    await this.send("Page.stopScreencast").catch(() => {});
  }
}

/**
 * Runs the exact grounded explain the browser will ask for, so the browser's
 * own request is a response-cache hit: the answer and its citations render
 * instantly and the capture spends no provider tokens on it. Best effort —
 * a failure just means the browser pays for the call itself.
 */
async function warmExplainCache(tokens) {
  try {
    const headers = { Authorization: `Bearer ${tokens.access}` };
    const listed = await (await fetchWithRetry(`${API_URL}/rag/documents/`, { headers })).json();
    const listBody = listed?.ok === true ? listed.data : listed;
    const documents = Array.isArray(listBody) ? listBody : listBody?.documents || [];
    const doc = (Array.isArray(documents) ? documents : []).find((d) => d.status === "ready");
    if (!doc) return console.warn("  ! no ready document to warm the cache with");

    const response = await fetchWithRetry(`${API_URL}/generate/`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: TOPIC,
        type: "explain",
        level: "beginner", // the level the Explain page defaults to
        document_ids: [doc.id],
      }),
    });
    const payload = await response.json();
    const body = payload?.ok === true ? payload.data : payload;
    console.log(`  cache warm: HTTP ${response.status}, ${(body?.sources || []).length} source(s)`);
  } catch (error) {
    console.warn(`  ! cache warm failed: ${error.message}`);
  }
}

// ── The flows ───────────────────────────────────────────────────────────────

async function signIn(page, { typed = false } = {}) {
  // Start from a guest session: /login redirects an authenticated visitor to
  // /explain, so the form would never appear.
  await page.goto(SITE_URL);
  await page.evaluate(`(() => { localStorage.clear(); return true; })()`);
  await page.goto(`${SITE_URL}/login`);
  await page.waitFor(`!!document.querySelector('input[type="password"]')`, {
    timeout: 20000,
    label: "login form",
  });
  const userSelector = 'input[type="text"], input:not([type]), input[autocomplete="username"]';
  const passSelector = 'input[type="password"]';
  if (typed) {
    await page.typeInto(userSelector, USER);
    await page.typeInto(passSelector, PASSWORD);
  } else {
    await page.fill(userSelector, USER);
    await page.fill(passSelector, PASSWORD);
  }
  await page.clickByText("Sign in", "button");
  await page.waitFor(`document.body.innerText.includes('Daily token budget') || location.pathname !== '/login'`, {
    timeout: 30000,
    label: "signed-in dashboard",
  });
  await page.settle(1500);
}

async function selectFirstDocument(page) {
  await page.clickByText("My documents", "button");
  await page.waitFor(`document.body.innerText.includes('ready')`, { timeout: 15000, label: "document list" });
  await sleep(700);
  const picked = await page.evaluate(
    `(() => {
      const cards = Array.from(document.querySelectorAll('div[title], div')).filter(
        (el) => el.className && typeof el.className === 'string' && el.className.includes('group') &&
                el.className.includes('rounded-xl') && (el.innerText || '').includes('Ready')
      );
      const card = cards[cards.length - 1];
      if (!card) return false;
      card.click();
      return true;
    })()`,
  );
  if (!picked) throw new Error("Could not find a ready document card to select.");
  await page.waitFor(`document.body.innerText.includes('Grounded in')`, {
    timeout: 10000,
    label: "document selected",
  });
  await sleep(500);
}

async function runGroundedExplanation(page, { capture = true } = {}) {
  await page.goto(`${SITE_URL}/explain`);
  await page.waitFor(`!!document.querySelector('input[placeholder*="Photosynthesis"]')`, {
    timeout: 20000,
    label: "explain input",
  });
  await selectFirstDocument(page);
  await page.fill('input[placeholder*="Photosynthesis"]', TOPIC);
  await page.clickByText("Explain This", "button");
  // The heading is rendered with CSS `uppercase`, and innerText reflects the
  // transformed text — so the DOM reads "SOURCES (1)", not "Sources (1)".
  const sourcesVisible = `document.body.innerText.toUpperCase().includes('SOURCES (')`;
  try {
    await page.waitFor(sourcesVisible, { timeout: 120000, label: "grounded answer with sources" });
  } catch {
    // The free-tier backend can answer 500 while it warms up; ask again.
    console.warn("  ! no sources after the first attempt — retrying");
    await page.clickByText("Explain This", "button");
    await page.waitFor(sourcesVisible, { timeout: 120000, label: "grounded answer with sources" });
  }
  await page.settle(1200);
  // Close the picker popover and bring the citations panel into view — the
  // panel is the point of this screenshot.
  await page.pressEscape();
  await sleep(600);
  await page.evaluate(
    `(() => {
      const heading = Array.from(document.querySelectorAll('p')).find((p) =>
        (p.innerText || '').toUpperCase().startsWith('SOURCES ('));
      if (heading) heading.scrollIntoView({ block: 'center' });
      return !!heading;
    })()`,
  );
  await sleep(700);
  if (capture) await page.screenshot("grounded-answer.png");
}

async function runChat(page, { capture = true, midStream = true } = {}) {
  await page.goto(`${SITE_URL}/chat`);
  await page.waitFor(`!!document.querySelector('input[placeholder*="Ask a question"]')`, {
    timeout: 20000,
    label: "chat input",
  });
  // The session rail must be settled before the shot, or it reads "Loading chats".
  await page
    .waitFor(`!document.body.innerText.includes('Loading chats')`, { timeout: 30000, label: "session list" })
    .catch(() => console.warn("  ! the session rail was still loading"));
  // Start a fresh conversation: the page otherwise restores the last session,
  // whose reply would be mistaken for the new one.
  await page.evaluate(
    `(() => {
      const button = document.querySelector('[aria-label="New Chat"]');
      if (button) { button.click(); return true; }
      return false;
    })()`,
  );
  await sleep(1200);
  const bubbleCount = `document.querySelectorAll('[class*="whitespace-pre-wrap"]').length`;
  const before = await page.evaluate(bubbleCount);
  await page.fill('input[placeholder*="Ask a question"]', CHAT_QUESTION);
  // The send button is the only button next to the chat input; lucide's icon
  // class is built at runtime, so it is not a stable selector.
  const sent = await page.evaluate(
    `(() => {
      const input = document.querySelector('input[placeholder*="Ask a question"]');
      if (!input) return 'no-input';
      const row = input.parentElement;
      const button = row && row.querySelector('button');
      if (!button) return 'no-button:' + (row ? row.className : 'no-row');
      button.click();
      return 'clicked';
    })()`,
  );
  if (sent !== "clicked") throw new Error(`Could not press send (${sent})`);
  const replyLength = `(() => {
    const bubbles = document.querySelectorAll('[class*="whitespace-pre-wrap"]');
    return bubbles.length ? bubbles[bubbles.length - 1].innerText.length : 0;
  })()`;
  // The page greets the student first, so "some text arrived" is not enough —
  // the reply itself has to be the last bubble and must not be the greeting.
  const replyText = `(() => {
    const bubbles = document.querySelectorAll('[class*="whitespace-pre-wrap"]');
    if (!bubbles.length) return '';
    return bubbles[bubbles.length - 1].innerText;
  })()`;
  if (midStream) {
    // The page greets the student first, so "some text arrived" is not enough:
    // a new assistant bubble has to exist, and it must not be the greeting.
    // (Only assistant bubbles carry the whitespace-pre-wrap class.)
    // The shot is taken while the reply is still partial — once the stream
    // ends the page re-renders the persisted message and the bubble appears
    // twice.
    await page.waitFor(
      `${bubbleCount} > ${before} && ${replyText}.length > 80 && ${replyText}.length < 700 &&
       !${replyText}.startsWith('Hey')`,
      { timeout: 90000, label: "streaming reply" },
    );
    // Bring the arriving text into view before the shot.
    await page.evaluate(
      `(() => {
        const bubbles = document.querySelectorAll('[class*="whitespace-pre-wrap"]');
        if (bubbles.length) bubbles[bubbles.length - 1].scrollIntoView({ block: 'end' });
        return true;
      })()`,
    );
    await sleep(500);
    if (capture) await page.screenshot("chat-stream.png");
  }
  // The stream is done when the reply length stops growing between two reads.
  let previous = -1;
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const current = await page.evaluate(replyLength);
    if (current > 0 && current === previous) break;
    previous = current;
  }
  await page.settle(800);
}

async function captureStills(page) {
  console.log("· landing page");
  await page.goto(SITE_URL);
  await page.waitFor(`document.body.innerText.trim().length > 40`, { timeout: 20000, label: "landing" });
  await page.settle(1500);
  await page.screenshot("landing.png");

  console.log("· dashboard");
  await signIn(page);
  await page.goto(SITE_URL); // the signed-in face of "/" is the dashboard
  await page
    .waitFor(
      `document.body.innerText.includes('Daily token budget') &&
       !document.body.innerText.includes('Loading setup progress')`,
      { timeout: 45000, label: "dashboard" },
    )
    .catch(() => console.warn("  ! a dashboard panel was still loading — capturing anyway"));
  await page.settle(1500);
  await page.screenshot("dashboard.png");

  console.log("· grounded answer");
  await runGroundedExplanation(page);
}

async function captureTour(page) {
  console.log("· recording the demo tour");
  await rm(FRAME_DIR, { recursive: true, force: true });
  await mkdir(FRAME_DIR, { recursive: true });
  const frames = [];
  await page.startScreencast(frames);

  // 0. Start as a guest — the stills phase already signed in, and /login
  //    redirects an authenticated visitor straight to /explain.
  await page.goto(SITE_URL);
  await page.evaluate(`(() => { localStorage.clear(); return true; })()`);
  await page.goto(SITE_URL);
  await page.settle(2500);

  // 1. Landing
  await page.goto(SITE_URL);
  await page.settle(2500);

  // 2. Sign in, typed on the keyboard
  await page.goto(`${SITE_URL}/login`);
  await page.waitFor(`!!document.querySelector('input[type="password"]')`, {
    timeout: 20000,
    label: "login form",
  });
  await page.settle(800);
  await page.typeInto('input[type="text"], input:not([type]), input[autocomplete="username"]', USER);
  await sleep(400);
  await page.typeInto('input[type="password"]', PASSWORD);
  await sleep(600);
  await page.clickByText("Sign in", "button");
  await page.waitFor(`location.pathname !== '/login'`, { timeout: 60000, label: "signed in" });
  await page.settle(2500);

  // 3. Dashboard — dwell long enough for a reader to take it in.
  await page.goto(SITE_URL);
  await page.settle(5000);

  // 4. Grounded explanation with citations
  await runGroundedExplanation(page, { capture: false });
  await page.settle(2500);

  // 5. Streaming chat — the one live provider call of the whole capture, so
  //    the streaming screenshot is taken here rather than twice.
  await runChat(page, { capture: true });
  await page.settle(1500);

  await page.stopScreencast();
  if (page.frameWrites) await page.frameWrites();
  const count = (await readdir(FRAME_DIR)).filter((f) => f.endsWith(".jpg")).length;
  console.log(`  ${count} screencast frames in scripts/capture/.frames`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!USER || !PASSWORD) {
    throw new Error("DEMO_USER and DEMO_PASSWORD are required (see docs/assets/README.md).");
  }
  await mkdir(OUT_DIR, { recursive: true });

  console.log("· warming up the API (Render free tier cold start)");
  const health = await fetchWithRetry(`${API_URL}/health/`, {}, { attempts: 3 });
  console.log(`  API health: HTTP ${health.status}`);

  console.log("· signing in");
  const tokens = await login();

  console.log("· warming the response cache for the grounded explanation");
  await warmExplainCache(tokens);

  const { child, wsUrl } = await launchChrome();
  const cdp = new CDP(wsUrl);
  await cdp.ready;

  try {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const page = new Page(cdp, sessionId);
    await page.prepare();

    if (ONLY === "chat") {
      // Iterate on one shot: sign in and re-take the streaming screenshot.
      await signIn(page);
      await runChat(page, { capture: true });
    } else {
      if (ONLY !== "gif") await captureStills(page);
      if (ONLY !== "stills") await captureTour(page);
    }
  } finally {
    cdp.close();
    child.kill();
  }
  console.log("done.");
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
});
