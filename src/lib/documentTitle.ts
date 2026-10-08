import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const APP_TITLE = 'IELTS Band Builder: Free Study Guide, 1000 Collocations';

const SUFFIX = ' — IELTS Band Builder';

// A distinct title per screen: screen readers announce it on navigation (WCAG 2.4.2) and browser tabs, history
// and bookmarks stay readable. The dashboard keeps the full app title. Essay pages set their own (EssayReader).
const TITLES: Record<string, string> = {
  '/browse': 'Browse collocations',
  '/essays': 'Model essays',
  '/phrases': 'Phrase bank',
  '/flashcards': 'Flashcards',
  '/fill-blank': 'Fill the blank',
  '/quiz': 'Quick quiz',
  '/writing': 'Writing practice',
  '/history': 'History',
  '/synonyms': '50 synonym upgrades',
  '/synonyms/flashcards': 'Synonym flashcards',
  '/synonyms/quiz': 'Synonym quiz',
  '/synonyms/type': 'Type the synonym',
  '/synonyms/rewrite': 'Rewrite with synonyms',
  '/synonyms/scanner': 'Essay vocabulary scanner',
  '/synonyms/timed': 'Timed writing test',
  '/synonyms/cheatsheet': 'Synonym cheat sheet',
  '/settings': 'Settings',
};

export function useRouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/essays/') || pathname.startsWith('/synonyms/word/')) return; // those pages set their own
    const name = TITLES[pathname];
    document.title = name ? name + SUFFIX : APP_TITLE;
  }, [pathname]);
}
