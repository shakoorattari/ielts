import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WORDS, WORD_BY_N, TOPIC_LABEL } from './synonyms';
import { useSynState } from './synState';

export type ScopeKind = 'all' | 'my' | 'topic' | 'word';

export interface SynScope {
  kind: ScopeKind;
  /** Word numbers in scope, or undefined for every word. */
  words: number[] | undefined;
  label: string;
  topic: string;
  word: number | null;
}

/** Reads ?set=my, ?topic=education or ?word=12 from the URL so every practice mode can be narrowed the same way. */
export function useSynScope(): SynScope & { setScope: (kind: ScopeKind, value?: string) => void } {
  const [params, setParams] = useSearchParams();
  const { state } = useSynState();
  const wordParam = Number(params.get('word'));
  const topic = params.get('topic') ?? '';
  const set = params.get('set');

  const scope = useMemo<SynScope>(() => {
    if (wordParam && WORD_BY_N[wordParam]) {
      return { kind: 'word', words: [wordParam], label: `“${WORD_BY_N[wordParam].word}” only`, topic: '', word: wordParam };
    }
    if (set === 'my') {
      return { kind: 'my', words: state.my, label: `My ${state.my.length || ''} words`.replace('  ', ' '), topic: '', word: null };
    }
    if (topic && TOPIC_LABEL[topic]) {
      return {
        kind: 'topic',
        words: WORDS.filter((w) => w.topics.includes(topic)).map((w) => w.n),
        label: TOPIC_LABEL[topic],
        topic,
        word: null,
      };
    }
    return { kind: 'all', words: undefined, label: 'All 50 words', topic: '', word: null };
  }, [wordParam, set, topic, state.my]);

  function setScope(kind: ScopeKind, value?: string) {
    const next = new URLSearchParams();
    if (kind === 'my') next.set('set', 'my');
    if (kind === 'topic' && value) next.set('topic', value);
    if (kind === 'word' && value) next.set('word', value);
    setParams(next, { replace: true });
  }

  return { ...scope, setScope };
}
