import { askJson } from './chromeAi';
import { TOPIC_LABEL, findSpan, type Syn, type SynWord } from './synonyms';

/*
 * The AI coach's tasks. The model is small and runs on the learner's device, so every task is narrow,
 * asks for a fixed JSON shape, and its answer is checked before it is shown (for example, a quoted
 * "problem" must really appear in the learner's text). It judges vocabulary only and never gives a band score.
 */

const SYSTEM =
  'You are a careful, friendly IELTS writing tutor. You help learners choose precise, natural words. ' +
  'You judge ONLY vocabulary: word choice, meaning, collocation (which words naturally go together) and register ' +
  '(formal or informal). You do not comment on grammar, ideas or structure, and you never give an IELTS band score. ' +
  'Use British spelling. Be honest: if a word is acceptable but not the best choice, say so. ' +
  'Keep every explanation under 40 words. Reply only in the JSON format requested.';

const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
const notes = (syns: Syn[]) => syns.map((s) => `- ${s.w}: ${s.note}`).join('\n');

/* ------------------------------------------------------------------ one rewritten sentence */

export type Verdict = 'natural' | 'acceptable' | 'unnatural';

export interface SentenceReview {
  verdict: Verdict;
  explanation: string;
  better: string;
}

export async function reviewSentence(
  input: { plain: string; base: string; word: SynWord; learner: string },
  signal?: AbortSignal,
): Promise<SentenceReview> {
  const raw = await askJson<Partial<SentenceReview>>({
    key: 'sentence',
    system: SYSTEM,
    signal,
    schema: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['natural', 'acceptable', 'unnatural'] },
        explanation: { type: 'string' },
        better: { type: 'string' },
      },
      required: ['verdict', 'explanation', 'better'],
    },
    prompt:
      `A learner is practising upgrading a plain word.\n` +
      `Plain sentence: "${input.plain}"\n` +
      `Plain word being upgraded: "${input.base}"\n` +
      `Learner's version: "${input.learner.trim()}"\n` +
      `Upgrades suggested by the study guide for this word:\n${notes(input.word.syns)}\n\n` +
      `Task: say whether the learner's word choice is natural for academic IELTS writing. ` +
      `"natural" means accurate and idiomatic. "acceptable" means understandable but a weaker or less idiomatic choice. ` +
      `"unnatural" means a wrong meaning, a wrong collocation, or too informal. ` +
      `Explain in one or two short sentences, then give one improved full sentence as "better". ` +
      `If the learner's sentence is already natural, repeat it as "better".`,
  });
  const verdict: Verdict = raw.verdict === 'natural' || raw.verdict === 'unnatural' ? raw.verdict : 'acceptable';
  return {
    verdict,
    explanation: clip(raw.explanation, 400) || 'No explanation was given.',
    better: clip(raw.better, 400) || input.learner.trim(),
  };
}

/* ------------------------------------------------------------------ a paragraph or essay */

export interface TextIssue {
  quote: string;
  problem: string;
  fix: string;
}

export interface TextReview {
  strengths: string[];
  issues: TextIssue[];
  tip: string;
}

/** The on-device model has a small window, so only the first part of a long essay is reviewed. */
export const REVIEW_CHAR_LIMIT = 1800;

export async function reviewText(text: string, signal?: AbortSignal): Promise<{ review: TextReview; truncated: boolean }> {
  const body = text.trim();
  const part = body.length > REVIEW_CHAR_LIMIT ? body.slice(0, body.lastIndexOf(' ', REVIEW_CHAR_LIMIT) || REVIEW_CHAR_LIMIT) : body;
  const raw = await askJson<Partial<TextReview>>({
    key: 'text',
    system: SYSTEM,
    signal,
    schema: {
      type: 'object',
      properties: {
        strengths: { type: 'array', items: { type: 'string' }, maxItems: 3 },
        issues: {
          type: 'array',
          maxItems: 4,
          items: {
            type: 'object',
            properties: { quote: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } },
            required: ['quote', 'problem', 'fix'],
          },
        },
        tip: { type: 'string' },
      },
      required: ['strengths', 'issues', 'tip'],
    },
    prompt:
      `Review the vocabulary in this learner's writing.\n\nText:\n"""\n${part}\n"""\n\n` +
      `Find up to 4 word choices that are inaccurate, unnatural, too informal or repetitive. For each one, "quote" the exact ` +
      `words from the text (copy them exactly), say briefly what is wrong in "problem", and give a better phrase in "fix". ` +
      `Also list up to 3 things the learner did well with vocabulary in "strengths". Finish with one short "tip". ` +
      `If you find no problems, return an empty "issues" list.`,
  });
  const lower = part.toLowerCase();
  const issues = (Array.isArray(raw.issues) ? raw.issues : [])
    .map((i) => ({ quote: clip(i?.quote, 160), problem: clip(i?.problem, 300), fix: clip(i?.fix, 200) }))
    // A "problem" quoted from words that aren't in the text is the model making things up. Drop it.
    .filter((i) => i.quote && i.problem && lower.includes(i.quote.toLowerCase()))
    .slice(0, 4);
  return {
    review: {
      strengths: (Array.isArray(raw.strengths) ? raw.strengths : []).map((s) => clip(s, 200)).filter(Boolean).slice(0, 3),
      issues,
      tip: clip(raw.tip, 300),
    },
    truncated: body.length > part.length,
  };
}

/* ------------------------------------------------------------------ word page: new examples and differences */

export interface NewExample {
  syn: string;
  sentence: string;
}

export async function newExamples(word: SynWord, topic: string, count = 3, signal?: AbortSignal): Promise<NewExample[]> {
  const raw = await askJson<{ examples?: Partial<NewExample>[] }>({
    key: 'examples',
    system: SYSTEM,
    signal,
    schema: {
      type: 'object',
      properties: {
        examples: {
          type: 'array',
          maxItems: count,
          items: {
            type: 'object',
            properties: { syn: { type: 'string' }, sentence: { type: 'string' } },
            required: ['syn', 'sentence'],
          },
        },
      },
      required: ['examples'],
    },
    prompt:
      `Plain word: "${word.word}". Upgrades:\n${notes(word.syns)}\n\n` +
      `Write ${count} new, natural sentences in the style of IELTS Task 2 essays about "${TOPIC_LABEL[topic] ?? topic}". ` +
      `Each sentence must use a different upgrade from the list, written exactly as listed. ` +
      `Give the upgrade in "syn" and the full sentence in "sentence".`,
  });
  const valid = new Set(word.syns.map((s) => s.w));
  return (Array.isArray(raw.examples) ? raw.examples : [])
    .map((e) => ({ syn: clip(e?.syn, 60), sentence: clip(e?.sentence, 300) }))
    // Keep only sentences that really contain the upgrade they claim to use.
    .filter((e) => valid.has(e.syn) && e.sentence && findSpan(e.sentence, e.syn))
    .slice(0, count);
}

export interface Difference {
  summary: string;
  usage: { syn: string; when: string }[];
}

export async function explainDifferences(word: SynWord, signal?: AbortSignal): Promise<Difference> {
  const raw = await askJson<Partial<Difference>>({
    key: 'difference',
    system: SYSTEM,
    signal,
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        usage: {
          type: 'array',
          items: { type: 'object', properties: { syn: { type: 'string' }, when: { type: 'string' } }, required: ['syn', 'when'] },
        },
      },
      required: ['summary', 'usage'],
    },
    prompt:
      `Plain word: "${word.word}". The study guide lists these upgrades:\n${notes(word.syns)}\n\n` +
      `Explain to a learner when to choose each upgrade. "summary" is one sentence on the main difference between them. ` +
      `"usage" has one entry per upgrade: "syn" is the upgrade and "when" is one short phrase saying when to use it.`,
  });
  const valid = new Set(word.syns.map((s) => s.w));
  return {
    summary: clip(raw.summary, 300),
    usage: (Array.isArray(raw.usage) ? raw.usage : [])
      .map((u) => ({ syn: clip(u?.syn, 60), when: clip(u?.when, 200) }))
      .filter((u) => valid.has(u.syn) && u.when),
  };
}
