"use client";

// The slide-in detail panel. Always shows the ACTIVE BRANCH as a list of rows
// (one per leaf), highlighting the selected leaf and expanding its full detail
// in place - so every fact from the old site (project metrics/arch/stack/links,
// full resume bullets + the PDF/plain-text export, skill items, changelog notes,
// contact links) is reachable here. Rows stay in sync with the canvas selection.

import { useCallback, useState } from "react";
import type { Branch, Leaf } from "@/lib/portfolio-graph";
import { resumeToPlainText } from "@/lib/resume-export";

const ARCH_TINT: Record<string, string> = {
  actor: "var(--sm-accent)",
  gateway: "var(--sm-blue)",
  guard: "var(--sm-coral)",
  system: "var(--sm-green)",
  store: "var(--sm-violet)",
  io: "var(--sm-gold)",
};

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function NodePanel({
  branch,
  selectedLeafId,
  onClose,
  onSelectLeaf,
  onJump,
  labelOf,
}: {
  branch: Branch | null;
  selectedLeafId: string | null;
  onClose: () => void;
  onSelectLeaf: (id: string) => void;
  onJump: (id: string) => void;
  labelOf: (id: string) => string;
}) {
  const open = !!branch;
  return (
    <aside className={`sm-panel${open ? " sm-panel-open" : ""}`} aria-hidden={!open}>
      {branch ? (
        <>
          <header className="sm-panel-head">
            <div>
              <div className="sm-kicker">{branch.label}</div>
              <h3 className="sm-panel-title">{branch.title}</h3>
            </div>
            <button className="sm-panel-x" onClick={onClose} aria-label="close panel">
              ✕
            </button>
          </header>
          <div className="sm-panel-body">
            <p className="sm-lead">{branch.lead}</p>

            {branch.id === "changelog" ? (
              <ul className="sm-rowlist">
                {(branch.versions ?? []).map((v) => (
                  <li key={v.version} className="sm-row sm-row-static">
                    <div className="sm-row-head">
                      <span className="sm-row-label">v{v.version}</span>
                      <span className="sm-row-tag">{v.date}</span>
                    </div>
                    <ul className="sm-bullets">
                      {v.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="sm-rowlist">
                {branch.leaves.map((leaf) => (
                  <PanelRow
                    key={leaf.id}
                    leaf={leaf}
                    selected={selectedLeafId === leaf.id}
                    onSelect={onSelectLeaf}
                    onJump={onJump}
                    labelOf={labelOf}
                  />
                ))}
              </ul>
            )}

            {branch.id === "resume" ? <ResumeActions /> : null}
          </div>
        </>
      ) : null}
    </aside>
  );
}

function PanelRow({
  leaf,
  selected,
  onSelect,
  onJump,
  labelOf,
}: {
  leaf: Leaf;
  selected: boolean;
  onSelect: (id: string) => void;
  onJump: (id: string) => void;
  labelOf: (id: string) => string;
}) {
  const hasDot = leaf.branch === "skills" || leaf.branch === "projects";
  const dotClass =
    leaf.branch === "skills"
      ? `sm-dot sm-dot-${leaf.status ?? "plain"}`
      : "sm-dot sm-dot-filled";

  return (
    <li className={`sm-row${selected ? " sm-row-on" : ""}`}>
      <button className="sm-row-btn" onClick={() => onSelect(leaf.id)}>
        <div className="sm-row-head">
          {hasDot ? <span className={dotClass} /> : null}
          <span className="sm-row-label">{leaf.label}</span>
          {leaf.tag ? <span className="sm-row-tag">{leaf.tag}</span> : null}
        </div>
        {leaf.blurb ? <p className="sm-row-blurb">{leaf.blurb}</p> : null}
      </button>

      {selected ? (
        <div className="sm-row-detail">
          {/* skills: the real skill list + the projects that prove it */}
          {leaf.items?.length ? (
            <div className="sm-chips">
              {leaf.items.map((it) => (
                <span key={it} className="sm-chip">
                  {it}
                </span>
              ))}
            </div>
          ) : null}

          {/* projects: domain, metrics, architecture, full stack, link */}
          {leaf.domain ? <div className="sm-domain">{leaf.domain}</div> : null}
          {leaf.metrics?.length ? (
            <div className="sm-metrics">
              {leaf.metrics.map((m) => (
                <div key={m.label} className="sm-metric">
                  <div className="sm-metric-num">{m.value}</div>
                  <div className="sm-metric-label">{m.label}</div>
                </div>
              ))}
            </div>
          ) : null}
          {leaf.arch?.length ? (
            <div className="sm-arch">
              {leaf.arch.map((a, i) => (
                <span key={i} className="sm-arch-item">
                  <span
                    className="sm-chip"
                    style={{ borderColor: ARCH_TINT[a.kind], color: ARCH_TINT[a.kind] }}
                  >
                    {a.label}
                  </span>
                  {i < leaf.arch!.length - 1 ? <span className="sm-arrow">→</span> : null}
                </span>
              ))}
            </div>
          ) : null}
          {leaf.tags?.length ? (
            <div className="sm-chips">
              {leaf.tags.map((t) => (
                <span key={t} className="sm-chip">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {/* resume: full bullet points */}
          {leaf.points?.length ? (
            <ul className="sm-bullets">
              {leaf.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : null}

          {/* cross-links: project <-> skill jumps */}
          {leaf.cross?.length ? (
            <div className="sm-jumpwrap">
              <span className="sm-jump-label">
                {leaf.branch === "projects" ? "skills used" : "proven in"}
              </span>
              <div className="sm-chips">
                {leaf.cross.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="sm-chip sm-chip-jump"
                    onClick={() => onJump(id)}
                  >
                    {labelOf(id)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* contact + project links */}
          {leaf.href ? (
            <a className="sm-linkbtn" href={leaf.href} target="_blank" rel="noreferrer">
              open {leaf.label} ↗
            </a>
          ) : null}
          {leaf.link ? (
            <a className="sm-linkbtn" href={leaf.link} target="_blank" rel="noreferrer">
              view on GitHub ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

// Take-away actions for the resume: a one-click download of the controlled,
// fixed-geometry PDF, and a copy of the whole resume as clean ATS-ready text.
function ResumeActions() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    const text = resumeToPlainText();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = legacyCopy(text);
      }
    } catch {
      ok = legacyCopy(text);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, []);

  return (
    <div className="sm-resume-actions">
      <a
        className="sm-linkbtn sm-linkbtn-solid"
        href="/Swayam_Barik_Resume.pdf"
        download="Swayam_Barik_Resume.pdf"
        aria-label="download the resume as a PDF"
      >
        Download PDF ↓
      </a>
      <button
        type="button"
        className="sm-linkbtn"
        onClick={copy}
        aria-label="copy resume as plain text"
      >
        {copied ? "Copied ✓" : "Copy as text"}
      </button>
    </div>
  );
}
