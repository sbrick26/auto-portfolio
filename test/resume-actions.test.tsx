import { describe, it, expect, afterEach, vi } from "vitest";
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
    expect(screen.getByLabelText("download the resume as a PDF")).toBeDefined();
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
    it("downloads the pre-generated fixed-geometry PDF (no print dialog)", () => {
      render(<ResumeOutput />);
      const link = screen.getByLabelText("download the resume as a PDF") as HTMLAnchorElement;
      // it is a direct download link to the controlled static PDF, not a print
      // button - so the file is identical in every browser, always one page.
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBe("/Swayam_Barik_Resume.pdf");
      expect(link.getAttribute("download")).toBe("Swayam_Barik_Resume.pdf");
    });

    it("always mounts the printable document the PDF is generated from", () => {
      render(<ResumeOutput />);
      const printable = document.querySelector(".resume-doc");
      expect(printable).not.toBeNull();
      expect(printable?.textContent).toContain(profile.name);
    });
  });
});
