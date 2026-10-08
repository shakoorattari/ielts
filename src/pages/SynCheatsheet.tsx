import { Link } from 'react-router-dom';
import { WORDS } from '../lib/synonyms';

/** One compact, printable page of every upgrade. "Print" lets the browser save it as a PDF. */
export function SynCheatsheet() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 animate-pop print:max-w-none">
      <header className="print:hidden">
        <Link to="/synonyms" className="text-sm font-medium text-brand-600 hover:underline">
          ← Synonyms
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Cheat sheet</h1>
        <p className="mt-1 text-ink-soft">
          All 50 plain words and their upgrades on one page. Press print and choose “Save as PDF” to keep a copy on your
          phone or stick it above your desk.
        </p>
        <button
          onClick={() => window.print()}
          className="mt-3 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600"
        >
          🖨️ Print or save as PDF
        </button>
      </header>

      <h2 className="hidden text-lg font-bold print:block">50 synonym upgrades for IELTS writing · IELTS Band Builder</h2>

      <table className="w-full border-collapse text-left text-sm print:text-[9pt]">
        <thead>
          <tr className="border-b-2 border-brand-500 text-xs uppercase tracking-wide text-brand-700">
            <th className="w-8 py-2 pr-2 font-semibold">#</th>
            <th className="w-32 py-2 pr-2 font-semibold">Plain word</th>
            <th className="py-2 font-semibold">Upgrades</th>
          </tr>
        </thead>
        <tbody>
          {WORDS.map((w) => (
            <tr key={w.n} className="break-inside-avoid border-b border-line align-top">
              <td className="py-1.5 pr-2 text-ink-soft">{w.n}</td>
              <td className="py-1.5 pr-2 font-bold">{w.word}</td>
              <td className="py-1.5">
                {w.syns.map((s, i) => (
                  <span key={s.w}>
                    <strong>{s.w}</strong>
                    <span className="text-ink-soft"> ({s.note})</span>
                    {i < w.syns.length - 1 ? '; ' : ''}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-soft">
        Word list adapted from “50 Synonyms That Actually Boost Your Score” by IELTS Advantage. Use two to five upgrades
        you are sure of in an essay. Never use a word you’re unsure about.
      </p>
    </div>
  );
}
