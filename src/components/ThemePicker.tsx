import { THEMES, useTheme } from '../lib/theme';

/** Row of theme swatches; used in the header menu and the essay reader. */
export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour theme">
      {THEMES.map((t) => {
        const active = theme === t.key;
        return (
          <button
            key={t.key}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(t.key)}
            title={t.label}
            className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition ${
              active ? 'border-brand-500 bg-brand-50 text-ink' : 'border-line bg-surface text-ink-soft hover:border-brand-300'
            }`}
          >
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-black/15 text-[9px] font-bold"
              style={{ background: t.swatch[0], color: t.swatch[1] }}
            >
              <span className="block h-1.5 w-1.5 rounded-full" style={{ background: t.swatch[2] }} />
            </span>
            {!compact && t.label}
          </button>
        );
      })}
    </div>
  );
}
