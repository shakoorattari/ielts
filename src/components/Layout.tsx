import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useProgress } from '../lib/progressContext';
import { useCloudSync } from '../lib/cloudSyncContext';
import { ThemeMenu } from './ThemeMenu';
import { UpdateNotice } from './UpdateNotice';
import { useRouteTitle } from '../lib/documentTitle';

interface Leaf {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}
interface Group {
  label: string;
  icon: string;
  /** Route prefixes that make this group look active. */
  prefixes: string[];
  items: Leaf[];
}

const NAV: (Leaf | Group)[] = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  {
    label: 'Collocations',
    icon: '🧩',
    prefixes: ['/browse', '/flashcards', '/fill-blank', '/quiz', '/writing'],
    items: [
      { to: '/browse', label: 'Browse', icon: '🔎' },
      { to: '/flashcards', label: 'Flashcards', icon: '🗂️' },
      { to: '/fill-blank', label: 'Fill the Blank', icon: '✍️' },
      { to: '/quiz', label: 'Quick Quiz', icon: '⚡' },
      { to: '/writing', label: 'Writing', icon: '📝' },
    ],
  },
  {
    label: 'Synonyms',
    icon: '🔁',
    prefixes: ['/synonyms'],
    items: [
      { to: '/synonyms', label: 'All 50 words', icon: '📚', end: true },
      { to: '/synonyms/flashcards', label: 'Flashcards', icon: '🗂️' },
      { to: '/synonyms/quiz', label: 'Quiz', icon: '⚡' },
      { to: '/synonyms/type', label: 'Type it', icon: '⌨️' },
      { to: '/synonyms/rewrite', label: 'Rewrite', icon: '✍️' },
      { to: '/synonyms/scanner', label: 'Essay scanner', icon: '🔍' },
      { to: '/synonyms/timed', label: 'Timed test', icon: '⏱️' },
      { to: '/synonyms/cheatsheet', label: 'Cheat sheet', icon: '🖨️' },
    ],
  },
  {
    label: 'Essays',
    icon: '📖',
    prefixes: ['/essays', '/phrases'],
    items: [
      { to: '/essays', label: 'Model essays', icon: '📖' },
      { to: '/phrases', label: 'Phrase bank', icon: '💬' },
    ],
  },
  { to: '/history', label: 'History', icon: '🕘' },
];

const isGroup = (e: Leaf | Group): e is Group => 'items' in e;
const groupActive = (g: Group, path: string) => g.prefixes.some((p) => path === p || path.startsWith(p + '/'));

export function Layout() {
  const { dueCount, streak } = useProgress();
  const sync = useCloudSync();
  const location = useLocation();
  useRouteTitle();
  // The menu is open only for the route it was opened on, so navigating closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const menuOpen = openAt === location.pathname;
  const setMenuOpen = (open: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((cur) => ((typeof open === 'function' ? open(cur === location.pathname) : open) ? location.pathname : null));
  // A desktop dropdown is likewise open only for the route it was opened on.
  const [groupAt, setGroupAt] = useState<{ label: string; path: string } | null>(null);
  const openGroup = groupAt && groupAt.path === location.pathname ? groupAt.label : null;
  const headerRef = useRef<HTMLElement>(null);

  // Close menus on Escape or a tap outside the header.
  const anyOpen = menuOpen || openGroup !== null;
  useEffect(() => {
    if (!anyOpen) return;
    function onDown(e: Event) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenAt(null);
        setGroupAt(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenAt(null);
        setGroupAt(null);
      }
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anyOpen]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-brand-50 lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <path d="M4 4l12 12M16 4L4 16" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" />
              )}
            </svg>
          </button>

          <NavLink to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-on-brand">
              IE
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight">IELTS Band Builder</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-brand-500 min-[400px]:block">
                Collocations &amp; Essays
              </span>
            </span>
          </NavLink>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 text-sm lg:flex" aria-label="Main">
            {NAV.map((item) =>
              isGroup(item) ? (
                <div key={item.label} className="relative">
                  <button
                    onClick={() =>
                      setGroupAt(openGroup === item.label ? null : { label: item.label, path: location.pathname })
                    }
                    aria-expanded={openGroup === item.label}
                    aria-haspopup="true"
                    className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${
                      groupActive(item, location.pathname)
                        ? 'bg-brand-500 text-on-brand'
                        : 'text-ink-soft hover:bg-brand-50 hover:text-ink'
                    }`}
                  >
                    {item.label}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <path d="M2 3.5l3 3 3-3" />
                    </svg>
                  </button>
                  {openGroup === item.label && (
                    <div className="absolute left-0 top-full z-40 mt-2 min-w-52 rounded-xl border border-line bg-surface p-1.5 shadow-lg animate-pop">
                      {item.items.map((leaf) => (
                        <NavLink
                          key={leaf.to}
                          to={leaf.to}
                          end={leaf.end}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              isActive ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-brand-50'
                            }`
                          }
                        >
                          <span aria-hidden>{leaf.icon}</span>
                          {leaf.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${
                      isActive ? 'bg-brand-500 text-on-brand' : 'text-ink-soft hover:bg-brand-50 hover:text-ink'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold sm:gap-2 lg:ml-0">
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-ink">
              🔥 {streak}
            </span>
            {dueCount > 0 && (
              <NavLink
                to="/flashcards"
                className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-rose-ink"
              >
                {dueCount}
                <span className="hidden min-[400px]:inline">due</span>
              </NavLink>
            )}
            {sync.connected && (
              <NavLink
                to="/settings"
                title={sync.status === 'error' ? `Sync error: ${sync.error}` : 'Synced across devices'}
                className={`hidden items-center gap-1 rounded-full px-2.5 py-1 sm:flex ${
                  sync.status === 'error' ? 'bg-rose-100 text-rose-ink' : 'bg-mint-100 text-mint-ink'
                }`}
              >
                {sync.status === 'syncing' ? '↻' : sync.status === 'error' ? '⚠' : '☁'}
              </NavLink>
            )}
            <ThemeMenu />
            <NavLink
              to="/settings"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-brand-50 hover:text-ink"
              aria-label="Settings"
            >
              ⚙️
            </NavLink>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-surface px-3 pb-4 pt-3 shadow-lg animate-pop sm:px-6 lg:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-4">
              {NAV.map((item) =>
                isGroup(item) ? (
                  <div key={item.label}>
                    <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      <span aria-hidden>{item.icon}</span> {item.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {item.items.map((leaf) => (
                        <MobileLink key={leaf.to} leaf={leaf} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={item.to} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <MobileLink leaf={item} />
                  </div>
                ),
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-ink-soft sm:px-6 print:hidden">
        Built by{' '}
        <a href="https://shakoorattari.com/" className="font-medium text-brand-700 underline underline-offset-2">
          Shakoor Hussain Attari
        </a>
        . Your progress is saved only in this browser. An independent study tool, not affiliated with or endorsed by the
        organisations that own the IELTS test.
        <span className="mt-2 block">
          Found a mistake, or something that doesn’t work? Please let me know through{' '}
          <a
            href="https://shakoorattari.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 underline underline-offset-2"
          >
            shakoorattari.com
          </a>{' '}
          or{' '}
          <a
            href="https://github.com/shakoorattari/ielts/issues/new"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 underline underline-offset-2"
          >
            report it on GitHub
          </a>
          . Corrections are welcome.
        </span>
      </footer>

      <UpdateNotice />
    </div>
  );
}

function MobileLink({ leaf }: { leaf: Leaf }) {
  return (
    <NavLink
      to={leaf.to}
      end={leaf.end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
          isActive ? 'bg-brand-500 text-on-brand' : 'bg-canvas text-ink hover:bg-brand-50'
        }`
      }
    >
      <span aria-hidden>{leaf.icon}</span>
      {leaf.label}
    </NavLink>
  );
}
