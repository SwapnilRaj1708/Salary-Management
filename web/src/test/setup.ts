import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Tests import Vitest explicitly (no globals), so Testing Library can't register this itself.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// jsdom doesn't implement scrolling; the router calls it on navigation.
window.scrollTo = () => {};
