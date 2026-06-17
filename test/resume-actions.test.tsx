import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { ResumeOutput } from "@/components/terminal/outputs";
import { profile, resume } from "@/content/data";
import { resumeToPlainText } from "@/lib/resume-export";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ResumeOutput actions", () => {
  it("renders the resume body alongside the take-away actions", () => {
    render(<ResumeOutput />);
    expect(screen.getByLabelText("copy resume as plain text")).toBeDefined();
    expect(screen.getByLabelText("print or save the resume as a PDF")).toBeDefined();
    expect(screen.getAllByText(resume.summary).length).toBeGreaterThan(0);
  });

  describe("copy as text", () => {
    it("writes the plain-text resume via the Clipboard API and confirms", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<ResumeOutput />);
      const btn = screen.getByLabelText("copy resume as plain text");
      await act(async () => {
        fireEvent.click(btn);
      });

      expect(writeText).toHaveBeenCalledWith(resumeToPlainText());
      expect(screen.getAllByText(/copied/i).length).toBeGreaterThan(0);
    });

    it("falls back to execCommand when the Clipboard API rejects", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("blocked"));
      Object.assign(navigator, { clipboard: { writeText } });
      const execCommand = vi.fn().mockReturnValue(true);
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: execCommand,
      });

      render(<ResumeOutput />);
      await act(async () => {
        fireEvent.click(screen.getByLabelText("copy resume as plain text"));
      });

      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(screen.getAllByText(/copied/i).length).toBeGreaterThan(0);
    });

    it("stays quiet when both clipboard paths fail", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("blocked"));
      Object.assign(navigator, { clipboard: { writeText } });
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: vi.fn().mockReturnValue(false),
      });

      render(<ResumeOutput />);
      await act(async () => {
        fireEvent.click(screen.getByLabelText("copy resume as plain text"));
      });

      expect(screen.queryByText(/copied/)).toBeNull();
    });
  });

  describe("save as PDF", () => {
    beforeEach(() => {
      Object.defineProperty(window, "print", {
        configurable: true,
        value: vi.fn(),
      });
    });

    it("mounts a printable document, fires print, and tears down afterprint", () => {
      render(<ResumeOutput />);
      act(() => {
        fireEvent.click(screen.getByLabelText("print or save the resume as a PDF"));
      });

      expect(window.print).toHaveBeenCalled();
      // the print-only doc renders a clean header with the candidate's name
      const printable = document.querySelector(".resume-doc");
      expect(printable).not.toBeNull();
      expect(printable?.textContent).toContain(profile.name);

      act(() => {
        window.dispatchEvent(new Event("afterprint"));
      });
      expect(document.querySelector(".resume-doc")).toBeNull();
    });
  });
});
