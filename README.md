# IELTS Band Builder — a free IELTS study guide

**Live:** https://shakoorattari.com/ielts/

A focused study guide and practice app for memorizing and actively using the **1000 IELTS collocations**
(10 themes × 10 topics × 10 collocations each) needed for a Band 8 writing/speaking score.

Built with React, TypeScript, Tailwind CSS, and a local spaced-repetition engine —
no backend, no accounts. Progress is stored in your browser's `localStorage`, with an
optional opt-in sync to keep it consistent across devices (see below).

## Features

- **Dashboard** — mastery breakdown (new / learning / review / mastered), streak, and
  per-theme progress at a glance.
- **Browse** — read through all 1000 collocations by theme/topic, or fuzzy-search any of them.
- **Flashcards** — SM-2 style spaced-repetition review. Due items resurface automatically;
  grade each card Again / Hard / Good / Easy and the schedule adapts.
- **Fill the Blank** — the example sentence is shown with the collocation blanked out; type
  the missing phrase (typo-tolerant matching) to train active recall.
- **Quick Quiz** — multiple-choice meaning quiz, four options per question.
- **Writing Practice** — pick a topic, get a mini writing prompt, draft your own sentences
  (autosaved), and tick off each collocation as you use it correctly.
- **History** — every completed Flashcards/Fill the Blank/Quick Quiz round is logged with its
  score, theme, and timestamp; the Dashboard also surfaces the most recent attempts.

- **Synonym upgrades** (`#/synonyms`) — the 50 plain words that appear in most essays (people,
  important, good…) with 134 precise upgrades, built around the guide's four-step system (pick your
  starting five → context practice → pressure testing → integration). Each word page has a
  swap-in sentence viewer, audio, memory hooks, "use with care" notes and your own sentences.
  Practise five ways: spaced-repetition **flashcards**, a **quiz** (upgrade the word, match the
  meaning, tricky context questions), **type it** recall, **rewrite** drills (sentences and
  paragraphs), and an **essay scanner** that marks overused plain words and suggests upgrades. A
  **AI coach** (beta, Chrome only) gives feedback on your own sentences and writing using Chrome's
  built-in on-device AI; **timed test** uses real essay questions with your target words tracked live, and a printable
  **cheat sheet** saves as a PDF. The 202 model essays feed several of these: the scanner can load
  any essay (or open from a "Scan vocabulary" button on each essay), each word page shows real
  sentences from the essays that use its upgrades (or says when none do), and the rewrite drill
  can serve paragraphs from the essays. The essay text is only fetched when one of these is used. Two explainer videos are embedded click-to-load.
- **Model essays** — a library of 202 IELTS Task 2 essays, filterable by essay type
  (Agree/Disagree, Discuss Both Views, Advantages & Disadvantages, Cause/Effect/Solution,
  Combination) and by topic, with full-text search and a "random essay" button. The reader
  highlights key phrases, lists them in a *phrase → meaning / synonyms* table, adjusts text size,
  tracks read / saved essays, steps through essays with ‹ › (or the arrow keys), and has a
  250-word answer box so you can write your own response to each question.
- **Phrase bank** — every highlighted key phrase from the essays, A–Z and searchable, with a short
  meaning and links to each essay it appears in.

Every practice mode feeds the same per-item mastery record, so progress made in any mode
moves that collocation through the same new → learning → review → mastered pipeline.

In-progress rounds (current queue/question, index, running score) are persisted to
`localStorage` as you go, so refreshing the page mid-session resumes exactly where you left
off instead of starting over.

## Syncing progress across devices

By default all progress lives only in the browser you're using — a phone's Safari and a
laptop's Chrome are two completely separate, unsynced copies. To share progress between
devices, go to **Settings → Sync across devices**:

1. Create a GitHub **classic** personal access token at
   [github.com/settings/tokens](https://github.com/settings/tokens) → "Generate new token
   (classic)" → check only the **`gist`** scope (nothing else) → generate.
   (Fine-grained tokens don't support the Gists API, so it must be a classic token.)
2. On your first device, paste the token into Settings under "Set up new sync" and click
   **Enable sync**. This creates a private Gist to hold your progress and shows a **Sync ID**.
3. On each additional device, open Settings → "Join existing", paste a token (the same one or
   a separate token you create for that device — either works, as long as it's on the same
   GitHub account) and the Sync ID from step 2, then **Enable sync**.

After that, progress auto-syncs a few seconds after every change. The token and Sync ID are
stored only in that browser's `localStorage` — never committed to the repo, never bundled
into the built site. Merging is non-destructive: per-item mastery keeps whichever device
reviewed it more recently, and streak days / attempts history / writing checks are unioned
rather than overwritten, so syncing two devices with different progress never loses work from
either side.

## Data

`src/data/collocations.json` holds all 1000 entries, parsed once from the source
`1000_collocations.docx`. Each entry has a `term`, a natural `usage` phrase (e.g. "to
reduce class size"), a plain-English `meaning`, and an example sentence.

`src/data/essays.json` holds the 202 essays (question, body with `**highlighted**` phrases, type,
topics, and the key-phrase table). It was parsed from the source PDF; the phrase meanings are
hand-written short glosses. Essay reading progress, saved essays and written answers are kept in
`localStorage` (`ielts-essays:v1`) and are not part of the Gist sync. The essay pages are
code-split, so the ~0.5 MB of essay text only loads when you open them.

`src/data/synonyms.json` holds the 50 synonym entries (guide notes and example sentences, plus the
original practice sentences, memory hooks, cautions and context questions added here), six paragraph
rewrite tasks and 68 essay questions for the timed test. Synonym progress (spaced-repetition cards,
learned words, your starting five, own sentences, timed tests) lives in `localStorage`
(`ielts-synonyms:v1`) and is not part of the Gist sync. The word list and notes are adapted from the
"50 Synonyms That Actually Boost Your Score" guide by IELTS Advantage and credited in the app and in
`index.html`. The YouTube embeds use `youtube-nocookie.com` and load only after the visitor presses play.

## AI coach

The ✨ buttons on the rewrite drill, scanner, timed test and word pages give feedback on the learner's own
writing. There are two engines, and the site works fully without either.

1. **Chrome's built-in AI (preferred).** Uses the browser's
   [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) (`LanguageModel`), a small model that runs on
   the learner's own computer. Nothing is sent anywhere, there is no key and no cost. Chrome downloads the
   model itself, once, after the learner clicks "Turn on the AI coach" (desktop Windows/Mac/Linux, about 22 GB
   free disk).
2. **The learner's own free AI key (phones, tablets, Safari, Firefox, computers that can't run the model).**
   Groq, Google Gemini, or any OpenAI-compatible service. The learner creates a key with the provider and pastes
   it in; it is stored only in their browser (`localStorage`, `ielts-ai-cloud:v1`) and requests go straight from
   their browser to the provider, so this site has no server and no cost. Nothing is sent until they tick a
   consent box, and the privacy line in every panel names the provider. The address must be `https://`. Models
   are looked up from the provider's `/models` list rather than hard-coded, because names change often. Keys can
   be removed under Settings.

Everything is feature-detected. Other browsers and phones get a plain explanation (and, for the on-device
engine, a suggestion to open the page in Chrome on a computer). If both engines are available, on-device wins.

- `src/lib/chromeAi.ts`: on-device detection, the one-time download, JSON-constrained prompts.
- `src/lib/cloudAi.ts`: provider presets, key storage, OpenAI-style chat calls (JSON mode with a retry
  without it), model discovery.
- `src/lib/aiEngine.ts`: chooses the engine; `src/lib/aiCoach.ts`: the four tasks (review a sentence, review a
  paragraph, new example sentences, when-to-use-which). Each asks for a fixed JSON shape and validates the answer
  before it is shown (a quoted "problem" must appear in the learner's text; an example must contain the upgrade it
  claims).
- `src/components/AiCoach.tsx` (gate and panels) and `AiCloudSetup.tsx` (key setup).

The coach judges vocabulary only and never gives a band score. The models can be wrong, and the UI says so.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. To produce a static production build:

```bash
npm run build
npm run preview
```

The build output in `dist/` is a fully static site (uses hash-based routing), so it can be
hosted anywhere — GitHub Pages, Netlify, Vercel, or just opened locally.

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the app, runs the SEO
check and publishes `dist/` to GitHub Pages automatically — no manual deploy step. Pull requests run
the same build and check but never deploy.

The site is served at **https://shakoorattari.com/ielts/**: this repository is a GitHub Pages project
site, and the account's user site (`shakoorattari.github.io`) owns the custom domain. The old
`shakoorattari.github.io/ielts/` address redirects there.

## SEO

A single-page app with hash routes (`#/flashcards`, …) has exactly **one indexable URL**: a URL fragment
is not a separate page to a search engine. So the work is about making that one URL as findable and
shareable as possible, and keeping it that way.

- **`index.html`** carries the title, description, canonical URL, Open Graph and Twitter tags, theme
  colours, icons and `WebApplication` JSON-LD (author = the person on https://shakoorattari.com/;
  free; deliberately no ratings or reviews, because there are none).
- **A static shell inside `<div id="root">`** is the page content for anything that does not run
  JavaScript (some crawlers, link previews, AI assistants). React's `createRoot` replaces it when the
  app starts, so nothing flashes and nothing shifts (measured CLS 0). It must stay truthful and in
  step with the app: counts like "1000 collocations in 10 themes and 100 topics" are checked against the
  data when you change it.
- **Per-screen titles** (`src/lib/documentTitle.ts`) give each screen its own `document.title`
  (WCAG 2.4.2). When you add a route, add it to `TITLES`. `APP_TITLE` there must equal `<title>` in
  `index.html`; the SEO check enforces it.
- **`sitemap.xml`** is generated after every build (`npm`'s `postbuild`, `scripts/generate-sitemap.mjs`),
  with `lastmod` from git history. There is no `robots.txt` here on purpose: crawlers only read
  `/robots.txt` at the domain root, which belongs to the portfolio repo
  (`shakoorattari/shakoorattari.github.io`). Its `robots.txt` points at this sitemap.
- **`404.html`** is `noindex` and links back to the app.
- **`npm run check:seo`** (run in CI after the build) fails the build if any of that breaks: title and
  description length, canonical, Open Graph/Twitter parity, social image size, JSON-LD validity and
  honesty, the static shell (one `h1`, no skipped heading levels, enough text, `noscript`, link to the
  author), every referenced file existing, the sitemap and the 404 page.
- Colours are checked for contrast in all six themes with the `--color-on-brand` and `--color-*-ink`
  tokens in `src/index.css`. Use `text-on-brand` on `bg-brand-500` and `text-amber-ink` /
  `text-rose-ink` / `text-mint-ink` for status text, not `text-white` or `text-*-500`.

Essays are third-party material (see *Model essays* above); they are part of the app, not separate
indexable pages. Do not generate a page per essay without the owner's confirmation that the
publisher's permission covers it.

## Project structure

```
src/
  data/collocations.json   flattened source data
  types.ts                 shared types
  lib/
    collocations.ts        data helpers (flatten, search, distractors, blanking)
    srs.ts                 SM-2 style spaced-repetition scheduler
    match.ts               typo-tolerant answer matching for Fill the Blank
    storage.ts             localStorage read/write + import/export (mastery + attempts)
    useSessionStorage.ts   generic localStorage-backed useState for in-progress rounds
    attempts.ts            shared formatting helpers for the attempts history
    progressContext.tsx    React context exposing progress state + actions
    gistSync.ts            GitHub Gist API calls for cross-device sync
    mergeProgress.ts        non-destructive merge of two progress snapshots
    cloudSyncContext.tsx   React context: connect/disconnect/auto-push/pull
    essays.ts              essay data helpers: filters, search, phrase bank
    essayState.ts          localStorage store for read / saved / drafts / reader settings
    synonyms.ts            synonym data helpers: cloze/span finding, text analysis, question generators
    synState.ts            localStorage store for synonym cards, my words, sentences, timed tests
    useSynScope.ts         ?set=my / ?topic= / ?word= scope shared by every synonym practice mode
    essayLibrary.ts        on-demand loader for the essay text, used by the synonym pages
    chromeAi.ts            Chrome built-in AI: detection, one-time download, JSON prompts
    cloudAi.ts             the learner's own free AI key: providers, storage, chat calls
    aiEngine.ts            picks on-device or cloud for each request
    aiCoach.ts             the AI coach's tasks, prompts and answer validation
  components/               shared UI (nav layout)
  pages/                    one file per route
scripts/
  generate-sitemap.mjs     writes dist/sitemap.xml after the build
  check-seo.mjs            post-build SEO guard (`npm run check:seo`)
public/                    favicon, apple-touch-icon, og-image.jpg, 404.html, the essays PDF
```

## Roadmap ideas

- Audio pronunciation for each collocation
- Speaking-practice mode with recording + self-review
- Per-theme "exam readiness" score combining all four practice modes
- PWA/offline support
