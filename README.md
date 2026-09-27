# 1000 IELTS Collocations — Practice App

A focused practice app for memorizing and actively using the **1000 IELTS collocations**
(10 themes × 10 topics × 10 collocations each) needed for a Band 8 writing/speaking score.

Built with React, TypeScript, Tailwind CSS, and a local spaced-repetition engine —
no backend, no accounts. All progress is stored in your browser's `localStorage`.

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

Every practice mode feeds the same per-item mastery record, so progress made in any mode
moves that collocation through the same new → learning → review → mastered pipeline.

In-progress rounds (current queue/question, index, running score) are persisted to
`localStorage` as you go, so refreshing the page mid-session resumes exactly where you left
off instead of starting over.

## Data

`src/data/collocations.json` holds all 1000 entries, parsed once from the source
`1000_collocations.docx`. Each entry has a `term`, a natural `usage` phrase (e.g. "to
reduce class size"), a plain-English `meaning`, and an example sentence.

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
  components/               shared UI (nav layout)
  pages/                    one file per route
```

## Roadmap ideas

- Audio pronunciation for each collocation
- Speaking-practice mode with recording + self-review
- Per-theme "exam readiness" score combining all four practice modes
- PWA/offline support
