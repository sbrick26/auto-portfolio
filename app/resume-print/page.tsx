import type { Metadata } from "next";
import { PrintableResume } from "@/components/resume/PrintableResume";

// Print utility route: blank on screen (the resume-doc is print-media only),
// rendered by the PDF generator (e2e/gen-resume-pdf.spec.ts) and the one-page
// CI gate (e2e/resume-onepage.spec.ts). Not linked from the UI, not indexed.
export const metadata: Metadata = {
  title: "resume (print)",
  robots: { index: false, follow: false },
};

export default function ResumePrintPage() {
  return <PrintableResume />;
}
