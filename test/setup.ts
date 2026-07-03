// jsdom is missing a few browser APIs the app uses; stub them for tests.

import { vi } from "vitest";

// No test should hit the real network. Components that fetch (e.g. the pipeline
// panel's live "last shipped" strip) must fall back gracefully, so default fetch
// to a rejecting stub; suites that exercise fetch install their own local mock.
global.fetch = vi.fn(() =>
  Promise.reject(new Error("network disabled in tests")),
) as unknown as typeof fetch;

window.HTMLElement.prototype.scrollIntoView = () => {};
// jsdom logs "Not implemented" for scrollTo; Session uses it to follow output.
window.HTMLElement.prototype.scrollTo = () => {};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// recharts ResponsiveContainer needs ResizeObserver
window.ResizeObserver = window.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// the Session tracks the topmost block with IntersectionObserver
window.IntersectionObserver =
  window.IntersectionObserver ?? (IntersectionObserverStub as unknown as typeof IntersectionObserver);

window.matchMedia =
  window.matchMedia ??
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList);
