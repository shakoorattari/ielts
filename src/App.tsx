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

export function App() {
  return (
    <ProgressProvider>
      <CloudSyncProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/fill-blank" element={<FillBlank />} />
              <Route path="/quiz" element={<MultipleChoice />} />
              <Route path="/writing" element={<Writing />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </HashRouter>
      </CloudSyncProvider>
    </ProgressProvider>
  );
}
