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
