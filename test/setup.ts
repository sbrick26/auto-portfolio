// jsdom is missing a few browser APIs the app uses; stub them for tests.

window.HTMLElement.prototype.scrollIntoView = () => {};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// recharts ResponsiveContainer needs ResizeObserver
window.ResizeObserver = window.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

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
