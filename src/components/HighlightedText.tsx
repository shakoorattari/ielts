import { Fragment } from 'react';
import type { Segment } from '../lib/synonyms';

/**
 * Renders text with plain words (amber) and upgrades (green) marked. Pass `onPick` to make the marks
 * clickable, for example to open the suggestions for a word.
 */
export function HighlightedText({
  text,
  segments,
  onPick,
  activeN,
}: {
  text: string;
  segments: Segment[];
  onPick?: (seg: Segment) => void;
  activeN?: number | null;
}) {
  const out: React.ReactNode[] = [];
  let at = 0;
  segments.forEach((s, i) => {
    if (s.start > at) out.push(<Fragment key={`t${i}`}>{text.slice(at, s.start)}</Fragment>);
    const label = text.slice(s.start, s.end);
    const tone =
      s.kind === 'basic'
        ? 'bg-amber-100 text-amber-ink'
        : 'bg-mint-100 text-mint-ink';
    const ring = activeN === s.n ? ' ring-2 ring-brand-500' : '';
    const cls = `rounded px-0.5 font-medium ${tone}${ring}`;
    out.push(
      onPick ? (
        <button
          key={`m${i}`}
          type="button"
          onClick={() => onPick(s)}
          className={`${cls} cursor-pointer`}
          title={s.kind === 'basic' ? 'Plain word: tap for upgrades' : 'Upgrade used'}
        >
          {label}
        </button>
      ) : (
        <mark key={`m${i}`} className={cls}>
          {label}
        </mark>
      ),
    );
    at = s.end;
  });
  if (at < text.length) out.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return <span className="whitespace-pre-wrap">{out}</span>;
}
