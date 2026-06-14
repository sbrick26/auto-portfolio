import { describe, it, expect, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { Session, type Block } from "@/components/terminal/Session";

afterEach(cleanup);

const blocks: Block[] = [
  { id: 1, input: "skills", node: <div>a tall streaming output</div> },
];

function getScroller(container: HTMLElement): HTMLElement {
  return container.querySelector(".overflow-y-auto") as HTMLElement;
}

// jsdom does no layout, so fake the geometry the scroll handler reads.
function setGeometry(
  el: HTMLElement,
  { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number },
) {
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", { value: scrollTop, writable: true, configurable: true });
}

describe("Session output-following", () => {
  it("shows the jump-to-latest pill when the reader scrolls up past the threshold", () => {
    const { container } = render(<Session blocks={blocks} active />);
    const scroller = getScroller(container);

    // sitting at the bottom: no pill
    setGeometry(scroller, { scrollHeight: 1000, clientHeight: 300, scrollTop: 700 });
    fireEvent.scroll(scroller);
    expect(screen.queryByLabelText("scroll to latest output")).toBeNull();

    // scrolled well up: pill appears
    setGeometry(scroller, { scrollHeight: 1000, clientHeight: 300, scrollTop: 0 });
    fireEvent.scroll(scroller);
    expect(screen.getByLabelText("scroll to latest output")).toBeDefined();
  });

  it("re-pins and hides the pill when the pill is clicked", async () => {
    const { container } = render(<Session blocks={blocks} active />);
    const scroller = getScroller(container);

    setGeometry(scroller, { scrollHeight: 1000, clientHeight: 300, scrollTop: 0 });
    fireEvent.scroll(scroller);
    const pill = screen.getByLabelText("scroll to latest output");

    fireEvent.click(pill);
    // the pill animates out via AnimatePresence, so await its removal
    await waitForElementToBeRemoved(pill);
  });

  it("stays unpinned (pill shown) only until a new command arrives", async () => {
    const { container, rerender } = render(<Session blocks={blocks} active />);
    const scroller = getScroller(container);

    setGeometry(scroller, { scrollHeight: 1000, clientHeight: 300, scrollTop: 0 });
    fireEvent.scroll(scroller);
    const pill = screen.getByLabelText("scroll to latest output");

    // a new command grows blocks.length -> follow resets, pill clears
    rerender(
      <Session
        blocks={[...blocks, { id: 2, input: "me", node: <div>next</div> }]}
        active
      />,
    );
    await waitForElementToBeRemoved(pill);
  });
});
