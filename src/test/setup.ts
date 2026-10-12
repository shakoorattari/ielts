import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// jsdom has no matchMedia, speechSynthesis or scrollTo; the app feature-detects most of these, but a few call them directly.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
window.scrollTo = () => {};

// jsdom has no object URLs (the Speaking Studio makes them for playback).
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:test';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
