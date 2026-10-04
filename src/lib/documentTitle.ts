import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const APP_TITLE = 'IELTS Study Guide — 1000 Collocations & Model Essays';

const SUFFIX = ' — IELTS Study Guide';

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
  '/settings': 'Settings',
};

export function useRouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/essays/')) return; // EssayReader owns this one
    const name = TITLES[pathname];
    document.title = name ? name + SUFFIX : APP_TITLE;
  }, [pathname]);
}
