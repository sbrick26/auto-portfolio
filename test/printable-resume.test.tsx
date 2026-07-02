import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PrintableResume } from "@/components/resume/PrintableResume";
import { profile, resume, skills } from "@/content/data";

afterEach(cleanup);

// The print view is what gen-resume-pdf.spec.ts renders into the downloadable
// PDF (via /resume-print). Pin that it stays complete and data-driven.

describe("PrintableResume", () => {
  it("renders the full document from content/data.ts", () => {
    const { container } = render(<PrintableResume />);
    expect(container.querySelector(".resume-doc")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(profile.name);
    expect(screen.getByText("Summary")).toBeDefined();
    expect(screen.getByText(resume.summary)).toBeDefined();
    expect(container.querySelectorAll(".resume-doc-entry").length).toBe(
      resume.experience.length + resume.education.length,
    );
    expect(container.querySelectorAll(".resume-doc-skill").length).toBe(skills.length);
  });

  it("keeps contact info present but joined into one print line", () => {
    render(<PrintableResume />);
    const contact = document.querySelector(".resume-doc-contact")?.textContent ?? "";
    expect(contact).toContain(profile.location);
    expect(contact).toContain(profile.links.email);
  });
});
