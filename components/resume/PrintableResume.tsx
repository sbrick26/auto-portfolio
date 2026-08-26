// A print-only, document-style render of the resume, styled by the @media
// print rules in globals.css (hidden on screen). Shared by the terminal's
// resume output (mounted via portal while printing) and the /resume-print
// route that the PDF generator + one-page CI gate drive - so the downloadable
// PDF keeps working no matter which homepage design is live. Pure JSX over
// content/data.ts: edit the resume there and every consumer follows.

import { profile, resume, skills } from "@/content/data";

export function PrintableResume() {
  return (
    <div className="resume-doc">
      <header className="resume-doc-head">
        <h1>{profile.name}</h1>
        <div className="resume-doc-role">{profile.role}</div>
        <div className="resume-doc-contact">
          {[
            profile.location,
            profile.links.email,
            profile.links.github.replace("https://", ""),
            profile.links.linkedin.replace("https://www.", ""),
          ].join(" | ")}
        </div>
      </header>

      {resume.summary ? (
        <section>
          <h2>Summary</h2>
          <p>{resume.summary}</p>
        </section>
      ) : null}

      <section>
        <h2>Experience</h2>
        {resume.experience.map((e, i) => (
          <div className="resume-doc-entry" key={i}>
            <div className="resume-doc-entry-head">
              <span className="resume-doc-title">{e.title}</span>
              {e.when && <span className="resume-doc-when">{e.when}</span>}
            </div>
            {e.org && <div className="resume-doc-org">{e.org}</div>}
            <ul>
              {e.points.map((pt, j) => (
                <li key={j}>{pt}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {resume.projects?.length ? (
        <section>
          <h2>Projects</h2>
          {resume.projects.map((p) => (
            <div className="resume-doc-skill" key={p.name}>
              <strong>{p.name}</strong> - {p.desc}
            </div>
          ))}
        </section>
      ) : null}

      <section>
        <h2>Skills</h2>
        {(resume.skillsLines?.length
          ? resume.skillsLines
          : skills.map((g) => ({ label: g.category, items: g.items.map((s) => s.name).join(", ") }))
        ).map((line) => (
          <div className="resume-doc-skill" key={line.label}>
            <strong>{line.label}:</strong> {line.items}
          </div>
        ))}
      </section>

      <section>
        <h2>Education</h2>
        {resume.education.map((e, i) => (
          <div className="resume-doc-entry" key={i}>
            <div className="resume-doc-entry-head">
              <span className="resume-doc-title">{e.title}</span>
              {e.when && <span className="resume-doc-when">{e.when}</span>}
            </div>
            {e.org && <div className="resume-doc-org">{e.org}</div>}
          </div>
        ))}
      </section>
    </div>
  );
}
