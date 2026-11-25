---
name: studybuddy-ui-polish
description: |
  Polish the StudyBuddy React/Tailwind frontend: layout, typography, colour
  consistency, accessibility, loading/empty/error states, responsiveness and
  portfolio presentation. Use when the user asks to improve the look, feel,
  design, spacing, contrast, focus states, mobile layout, dark mode or "polish"
  of StudyBuddy screens — e.g. "make the quiz page cleaner", "the sidebar is
  cramped on mobile", "add focus rings", "the empty state looks broken". Triggers
  on requests about StudyBuddy UI/frontend presentation. Do NOT use for
  backend/Django/DRF or API work, RAG or prompt work, adding new features or
  changing behaviour — this skill changes presentation only.
---

# StudyBuddy UI polish

Improve the UI of StudyBuddy (React 18, Tailwind CSS, React Query, CRA) without
changing behaviour or breaking its Jest suite.

## Inputs to collect

- Which surface(s) are in scope: a single page, the whole app shell, or the
  shared components everything else inherits from. If the user names a page, work
  on that page and say in the summary what was deliberately left alone.
- Whether the request implies new behaviour (e.g. "add a dark mode toggle" needs
  state and persistence) — behaviour changes are out of scope; say so and keep
  to presentation.

Everything else is discoverable in the repo.

## Ground rules

- Read the existing component first (`frontend/src/components`,
  `frontend/src/pages`). Reuse `Button`, `Card`, `Input`, `PageHeader`,
  `LoadingSkeleton`, `SectionTitle` before creating new ones — a parallel
  component is how a design system forks.
- Keep the brand fonts from `tailwind.config.js`: Outfit (display), Plus Jakarta
  Sans (body), JetBrains Mono (code). `frontend/public/index.html` already loads
  exactly those three families; `frontend/src/index.css` carries a *second*
  `@import` (Inter plus a partial Outfit) and a `body { font-family: "Inter" }`
  that overrides the `font-body` token. Delete that `@import` line outright —
  do not replace it with another `@import`, which downloads the same families
  twice — and let `body`/headings use `font-body`/`font-display`. Check
  `App.jsx`'s toast font string too; it names Inter as well.
- Keep each study tool's accent colour consistent across its page, buttons,
  badges and history. The source of truth is `frontend/src/utils/routeColors.js`
  (`ROUTE_PRIMARY`, `ROUTE_GLOW`, `ROUTE_ACCENT_LINE`, `ROUTE_ACCENT_BG`) —
  extend that map instead of hard-coding a gradient in a page.
- Reuse the shared grounding pieces rather than rebuilding them: `DocumentPicker`,
  `DocumentSources`, `GroundingNote` in `frontend/src/components/shared/`.
- Change styling through Tailwind classes and shared components; avoid one-off
  inline styles.
- Keep the dark-canvas contrast contract in `routeColors.js`: white text on the
  accent fills measures 2.1–4.2:1, so accent buttons carry near-black ink
  (`text-slate-950`). Do not "improve" a button by putting white text back.
- The app shell is a **light** theme (body `#f1f5f9`, white cards) even though
  `routeColors.js` still talks about a dark canvas. Components that inherit
  dark-canvas tokens end up invisible on white: `text-slate-200` is ~1.2:1 and
  `text-slate-400` ~2.6:1, against the 4.5:1 floor, and a `bg-slate-950/60`
  progress track reads as a black bar on a white card. Audit every surface you
  touch for those tokens and re-step them to `slate-600`/`slate-700`.
- `App.jsx` renders `<main>` with no horizontal padding and the tool pages add
  none, so cards run edge-to-edge on a phone. Give a tool page the dashboard's
  gutter — `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` — instead of putting it in
  the shell: `ChatPage` fills the leftover viewport height
  (`flex flex-1 flex-col min-h-0`), so a shell-level container would change the
  chat layout.
- When the same markup is rendered by two pages, extract it into
  `frontend/src/components/shared/` (`CLAUDE.md` requires this) rather than
  patching both copies — the Quiz page and the All-in-One Studio both render
  the quiz results, and `Layout`/sidebar nav live in one place for the same
  reason.
- After every change run `npm run lint` and `npm test -- --watchAll=false`. Update
  snapshots or tests only when the markup change is intended.

## Procedure

1. **Establish the baseline.** Read the target page and the shared components it
   uses, then run `npm run lint` and `npm test -- --watchAll=false` before
   editing. Reason: a pre-existing failure otherwise gets attributed to your
   change.
2. **First screen.** Check the login and home pages say what the app does in one
   line and show the five tools clearly (`HomeLanding.jsx` for guests,
   `HomeDashboard.jsx` for signed-in users). Reason: this is what a visitor sees
   in ten seconds.
3. **Visual hierarchy.** Give each screen one clear primary action, a consistent
   spacing scale, and a readable line length for generated text. Reason: five
   equally-weighted buttons read as none.
4. **States.** Every async action needs loading (skeleton), empty, error (with
   retry) and success states, and the 429 daily-token-budget case needs a plain
   explanation rather than a raw status code. Reason: a failed request that
   looks like an empty account is the worst state a screen can ship.
5. **Streaming chat.** Auto-scroll that does not fight the user (don't yank the
   view while they are reading back), a visible stop/retry control, and a
   SOURCES panel that is easy to scan. Reason: the chat is the flagship surface
   and the citations are its proof.
6. **Accessibility.** Visible focus rings, at least 4.5:1 contrast for body text,
   a label on every input, keyboard-reachable menus, and
   `prefers-reduced-motion` respected for every animation (the app defines
   `animate-fade-up`, `animate-float`, `animate-pulse-slow` and more in
   `tailwind.config.js`). The reduced-motion block in `index.css` only covers
   the project's own keyframes, so Tailwind's built-ins (`animate-bounce`,
   `animate-pulse`) need the `motion-safe:` prefix or they keep moving for
   users who asked them not to. Reason: a keyboard-only user currently hits
   invisible focus on the shell nav.
7. **Responsive.** Check 375px, 768px and 1280px. The desktop sidebar is
   `hidden lg:flex` with a mobile header/dropdown at `lg:hidden`, so the small
   screen path already exists — verify it works rather than rebuilding it. On a
   375px screen also count the wasted width of fixed indents (a `ml-12` on
   answer options costs 48px of a ~327px column) and of fixed control rows that
   cannot wrap.
8. **Dark mode.** Add it only if the tokens are defined once and applied
   everywhere; a half-implemented dark mode is worse than none.

## Portfolio polish

- Capture 4 to 6 screenshots (home, chat with citations, quiz, flashcards,
  mobile) and a short GIF of streaming chat; add them to `docs/assets/` and
  reference them near the top of the README.
- Make sure the live demo link and demo sign-up instructions in the README work
  for a recruiter who has two minutes.

Note for the agent: `CLAUDE.md` states this repo ships **no committed images**
(`docs/assets/` holds only the sample document, no screenshot tooling). Adding
images is therefore a deliberate deviation from the repo's stated convention —
confirm it with the user before writing files into `docs/assets/`, and keep the
captures in a scratch directory if they only want them for review.

## Output contract

- The changed files under `frontend/src`, with the styling expressed in Tailwind
  classes and shared components.
- `npm run lint`, `npm test -- --watchAll=false` and `npm run build` all clean
  (the build matters when CSS or bundling is touched).
- A summary of: what changed per page, what was intentionally left alone, and
  how to verify it visually (which width, which state).

## Failure handling

- A failing test after a markup change: decide whether the change was intended.
  Intended → update the test or snapshot; unintended → revert the change rather
  than loosening the assertion.
- A contrast or accent change that breaks the near-black-on-accent contract:
  revert it and report the measured ratio instead of guessing a new palette.
- A request that needs new behaviour (dark-mode persistence, a new control
  wired to an API): implement the presentation half, then say plainly which
  behaviour is still missing.

## Examples

Input: "The quiz results panel is hard to scan and the mobile layout is cramped."

Output: widen the score/result block in `frontend/src/pages/QuizPage.jsx` and
`frontend/src/components/shared/ScoreCard.jsx` to a two-column grid at `md:` and
single column below it, keep the violet accent from `routeColors.js`, add the
missing `aria-label` on the score row, then report the lint/test/build results
and the widths to check (375 / 768 / 1280).

## Windows (win32) platform notes

Run every command from `frontend/` in PowerShell:

```powershell
Set-Location E:\studybuddy-langchain\frontend
npm run lint
npm test -- --watchAll=false
npm run build
```

`npm test -- --watchAll=false` exits non-zero on failure; check `$LASTEXITCODE`
before claiming the suite is green. There is no `python3` here — use `py` or
`python` if a backend check is needed.
