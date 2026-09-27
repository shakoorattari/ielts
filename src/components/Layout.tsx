import { NavLink, Outlet } from 'react-router-dom';
import { useProgress } from '../lib/progressContext';
import { useCloudSync } from '../lib/cloudSyncContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/browse', label: 'Browse' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/fill-blank', label: 'Fill the Blank' },
  { to: '/quiz', label: 'Quick Quiz' },
  { to: '/writing', label: 'Writing' },
  { to: '/history', label: 'History' },
];

export function Layout() {
  const { dueCount, streak } = useProgress();
  const sync = useCloudSync();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              IE
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold tracking-tight">IELTS Prep</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                Collocations
              </span>
            </span>
          </NavLink>

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-ink-soft hover:bg-brand-50 hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-500">
              🔥 {streak}
            </span>
            {dueCount > 0 && (
              <NavLink
                to="/flashcards"
                className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-rose-500"
              >
                {dueCount} due
              </NavLink>
            )}
            {sync.connected && (
              <NavLink
                to="/settings"
                title={sync.status === 'error' ? `Sync error: ${sync.error}` : 'Synced across devices'}
                className={`hidden items-center gap-1 rounded-full px-2.5 py-1 sm:flex ${
                  sync.status === 'error' ? 'bg-rose-100 text-rose-500' : 'bg-mint-100 text-mint-500'
                }`}
              >
                {sync.status === 'syncing' ? '↻' : sync.status === 'error' ? '⚠' : '☁'}
              </NavLink>
            )}
            <NavLink
              to="/settings"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-brand-50 hover:text-ink"
              aria-label="Settings"
            >
              ⚙️
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
