import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Tests import Vitest explicitly (no globals), so Testing Library can't register this itself.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Lazy routes import their module on first visit, and the Data Grid takes a moment to load in
// a fresh test worker; the 1 s default can run out on that first import.
configure({ asyncUtilTimeout: 5000 });

// jsdom doesn't implement scrolling; the router calls it on navigation.
window.scrollTo = () => {};
