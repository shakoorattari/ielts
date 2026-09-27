import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_ITEMS, THEMES, pickDistractorMeanings, shuffle } from '../lib/collocations';
import { useProgress } from '../lib/progressContext';
import type { Item } from '../types';

const ROUND_SIZE = 10;

interface Question {
  item: Item;
  options: string[];
}

function buildRound(themeId: number | null): Question[] {
  const scoped = themeId ? ALL_ITEMS.filter((i) => i.themeId === themeId) : ALL_ITEMS;
  const items = shuffle(scoped).slice(0, ROUND_SIZE);
  return items.map((item) => ({
    item,
    options: shuffle([item.meaning, ...pickDistractorMeanings(item, 3)]),
  }));
}

export function MultipleChoice() {
  const [params, setParams] = useSearchParams();
  const themeId = params.get('theme') ? Number(params.get('theme')) : null;
  const { recordResult } = useProgress();

  const [round, setRound] = useState<Question[]>(() => buildRound(themeId));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const q = round[index];
  const finished = !q;

  function restart(nextTheme: number | null) {
    setParams(nextTheme ? { theme: String(nextTheme) } : {});
    setRound(buildRound(nextTheme));
    setIndex(0);
    setSelected(null);
    setScore(0);
  }

  function choose(option: string) {
    if (selected) return;
    setSelected(option);
    const correct = option === q.item.meaning;
    if (correct) setScore((s) => s + 1);
    recordResult(q.item.id, correct);
  }

  function next() {
    setSelected(null);
    setIndex((i) => i + 1);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-pop">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quick Quiz</h1>
        <select
          value={themeId ?? ''}
          onChange={(e) => restart(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All themes</option>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {!finished && (
        <p className="text-sm text-ink-soft">
          Question {index + 1} of {round.length} · Score {score}/{round.length}
        </p>
      )}

      {finished ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
          <p className="text-3xl">{score === round.length ? '🏆' : '✅'}</p>
          <p className="text-lg font-semibold">
            Round complete — {score}/{round.length} correct
          </p>
          <button
            onClick={() => restart(themeId)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            New round
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            {q.item.themeTitle} · {q.item.topicTitle}
          </p>
          <p className="mt-3 text-lg font-semibold">
            What does <span className="text-brand-600">“{q.item.usage}”</span> mean?
          </p>

          <div className="mt-5 grid gap-2">
            {q.options.map((option) => {
              const isCorrect = option === q.item.meaning;
              const isSelected = option === selected;
              const showState = selected !== null;
              return (
                <button
                  key={option}
                  onClick={() => choose(option)}
                  disabled={showState}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                    showState && isCorrect
                      ? 'border-mint-500 bg-mint-100 text-mint-500'
                      : showState && isSelected
                        ? 'border-rose-500 bg-rose-100 text-rose-500'
                        : 'border-line hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-5 flex flex-col gap-3">
              <p className="text-sm italic text-ink-soft">“{q.item.example}”</p>
              <button
                onClick={next}
                className="self-start rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
