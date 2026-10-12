import { configureAxe } from 'vitest-axe';

// jsdom loads no CSS and has no canvas, so colour contrast cannot be measured here. Contrast is guaranteed by the
// theme tokens in index.css; the rest of axe's rules run as normal.
export const axe = configureAxe({ rules: { 'color-contrast': { enabled: false } } });
