import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHRASE_BANK, phraseLetter } from '../lib/essays';
import { SourceCredit } from '../components/SourceCredit';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

export function PhraseBank() {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('');

  const available = useMemo(() => new Set(PHRASE_BANK.map((p) => phraseLetter(p.phrase))), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PHRASE_BANK.filter((p) => {
      if (letter && phraseLetter(p.phrase) !== letter) return false;
      return !q || p.phrase.includes(q) || p.meaning.toLowerCase().includes(q);
    });
  }, [query, letter]);

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Phrase bank</h1>
        <p className="mt-1 text-ink-soft">
          {PHRASE_BANK.length} key phrases from the model essays with short meanings. Tap an essay number to see the
          phrase in context.
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a phrase or its meaning…"
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-sm outline-none focus:border-brand-500"
      />

      <div className="flex flex-wrap gap-1">
        <LetterBtn active={letter === ''} onClick={() => setLetter('')}>
          All
        </LetterBtn>
        {LETTERS.map((l) => (
          <LetterBtn key={l} active={letter === l} disabled={!available.has(l)} onClick={() => setLetter(l)}>
            {l}
          </LetterBtn>
        ))}
      </div>

      <p className="text-sm text-ink-soft">
        {results.length} phrase{results.length === 1 ? '' : 's'}
      </p>

      <div className="grid gap-2">
        {results.map((p) => (
          <div key={p.phrase} className="rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-semibold">{p.phrase}</span>
              <span className="text-sm text-ink-soft">{p.meaning}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.essays.map((n) => (
                <Link
                  key={n}
                  to={`/essays/${n}`}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-100"
                >
                  Essay {n}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SourceCredit />
    </div>
  );
}

function LetterBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-8 rounded-lg px-2 py-1 text-sm font-semibold transition ${
        active
          ? 'bg-brand-500 text-on-brand'
          : disabled
            ? 'text-ink-soft/40'
            : 'text-ink-soft hover:bg-brand-50 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
