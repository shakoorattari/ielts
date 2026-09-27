export interface RawCollocation {
  term: string;
  usage: string;
  meaning: string;
  example: string;
}

export interface RawTopic {
  id: number;
  title: string;
  collocations: RawCollocation[];
}

export interface RawTheme {
  id: number;
  title: string;
  topics: RawTopic[];
}

/** Flattened, addressable collocation used throughout the app. */
export interface Item {
  id: string;
  themeId: number;
  themeTitle: string;
  topicId: number;
  topicTitle: string;
  term: string;
  usage: string;
  meaning: string;
  example: string;
}

export type MasteryStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface ItemProgress {
  id: string;
  status: MasteryStatus;
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: number;
  lastReviewed: number | null;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface ProgressState {
  items: Record<string, ItemProgress>;
  history: string[];
  writingNotes: Record<string, string>;
  writingChecks: Record<string, boolean>;
  totalReviews: number;
}
