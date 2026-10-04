import { useEffect, useRef, useState } from 'react';
import { ThemePicker } from './ThemePicker';

/** Header button that opens a small popover with the theme picker. */
export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-brand-50 hover:text-ink"
        aria-label="Change theme"
        aria-expanded={open}
      >
        🎨
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-64 rounded-xl border border-line bg-surface p-3 shadow-lg animate-pop">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Theme</p>
          <ThemePicker />
        </div>
      )}
    </div>
  );
}
