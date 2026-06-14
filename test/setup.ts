// jsdom is missing a few browser APIs the app uses; stub them for tests.

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
