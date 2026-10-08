import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Browse } from './pages/Browse';
import { Flashcards } from './pages/Flashcards';
import { FillBlank } from './pages/FillBlank';
import { MultipleChoice } from './pages/MultipleChoice';
import { Writing } from './pages/Writing';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { ProgressProvider } from './lib/progressContext';
import { CloudSyncProvider } from './lib/cloudSyncContext';

// The essay library carries ~0.5 MB of text, so load it only when someone opens it.
const Essays = lazy(() => import('./pages/Essays').then((m) => ({ default: m.Essays })));
const EssayReader = lazy(() => import('./pages/EssayReader').then((m) => ({ default: m.EssayReader })));
const PhraseBank = lazy(() => import('./pages/PhraseBank').then((m) => ({ default: m.PhraseBank })));
// The synonym trainer likewise loads on demand.
const SynonymsHub = lazy(() => import('./pages/SynonymsHub').then((m) => ({ default: m.SynonymsHub })));
const SynonymWord = lazy(() => import('./pages/SynonymWord').then((m) => ({ default: m.SynonymWord })));
const SynFlashcards = lazy(() => import('./pages/SynFlashcards').then((m) => ({ default: m.SynFlashcards })));
const SynQuiz = lazy(() => import('./pages/SynQuiz').then((m) => ({ default: m.SynQuiz })));
const SynType = lazy(() => import('./pages/SynType').then((m) => ({ default: m.SynType })));
const SynRewrite = lazy(() => import('./pages/SynRewrite').then((m) => ({ default: m.SynRewrite })));
const SynScanner = lazy(() => import('./pages/SynScanner').then((m) => ({ default: m.SynScanner })));
const SynTimed = lazy(() => import('./pages/SynTimed').then((m) => ({ default: m.SynTimed })));
const SynCheatsheet = lazy(() => import('./pages/SynCheatsheet').then((m) => ({ default: m.SynCheatsheet })));

export function App() {
  return (
    <ProgressProvider>
      <CloudSyncProvider>
        <HashRouter>
          <Suspense fallback={<p className="p-8 text-center text-ink-soft">Loading…</p>}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/essays" element={<Essays />} />
              <Route path="/essays/:n" element={<EssayReader />} />
              <Route path="/phrases" element={<PhraseBank />} />
              <Route path="/synonyms" element={<SynonymsHub />} />
              <Route path="/synonyms/word/:n" element={<SynonymWord />} />
              <Route path="/synonyms/flashcards" element={<SynFlashcards />} />
              <Route path="/synonyms/quiz" element={<SynQuiz />} />
              <Route path="/synonyms/type" element={<SynType />} />
              <Route path="/synonyms/rewrite" element={<SynRewrite />} />
              <Route path="/synonyms/scanner" element={<SynScanner />} />
              <Route path="/synonyms/timed" element={<SynTimed />} />
              <Route path="/synonyms/cheatsheet" element={<SynCheatsheet />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/fill-blank" element={<FillBlank />} />
              <Route path="/quiz" element={<MultipleChoice />} />
              <Route path="/writing" element={<Writing />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          </Suspense>
        </HashRouter>
      </CloudSyncProvider>
    </ProgressProvider>
  );
}
