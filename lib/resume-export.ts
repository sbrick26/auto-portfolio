// Serialize the on-screen resume into clean plain text - the format a recruiter
// pastes into an ATS, an email, or a notes app. No markdown, no terminal chrome,
// no color codes; just labeled sections and hyphen bullets. Pure so it can be
// unit-tested and reused by both the copy button and any future export.
import { profile, resume, skills } from "@/content/data";

export function resumeToPlainText(): string {
  const lines: string[] = [];

  // Header: who, what, where, and the public ways to reach me.
  lines.push(profile.name);
  lines.push(profile.role);
  lines.push(
    [
      profile.location,
      profile.links.email,
      profile.links.github.replace("https://", ""),
      profile.links.linkedin.replace("https://www.", ""),
    ].join(" | "),
  );

  lines.push("", "SUMMARY", resume.summary);

  lines.push("", "EXPERIENCE");
  for (const e of resume.experience) {
    lines.push("");
    lines.push(e.when ? `${e.title} (${e.when})` : e.title);
    if (e.org) lines.push(e.org);
    for (const pt of e.points) lines.push(`- ${pt}`);
  }

  lines.push("", "SKILLS");
  for (const g of skills) {
    lines.push(`${g.category}: ${g.items.map((s) => s.name).join(", ")}`);
  }

  lines.push("", "EDUCATION");
  for (const e of resume.education) {
    lines.push("");
    lines.push(e.when ? `${e.title} (${e.when})` : e.title);
    if (e.org) lines.push(e.org);
  }

  // Trim stray leading/trailing blanks, guarantee a single trailing newline.
  return lines.join("\n").trim() + "\n";
}
