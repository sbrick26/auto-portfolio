import { Fragment } from "react";
import type { ArchKind, ArchNode } from "@/content/data";

// A compact architecture micro-diagram for a project card. The engagements are
// confidential - no live links, no screenshots - so an honest, owner-authored
// sketch of the SYSTEM SHAPE is the strongest visual proof available: it shows
// the design thinking (agent -> MCP server -> SSH tunnel -> live system) without
// exposing any client. It reads as a left-to-right flow of tinted chips joined
// by `->` arrows, which sits naturally inside the terminal aesthetic the rest of
// the site already uses for arrows (Ext, PipelineDiagram).
//
// It is deliberately a flow of inline chips rather than a fixed-coordinate SVG:
// labels vary in length across nine cards, and a flex flow wraps cleanly to a
// second line on a narrow phone instead of clipping or overflowing. It stays a
// quiet accent - small type, a single color dot per node - so it never competes
// with the metric tiles or grows the card into a second hero.

// Each role gets one accent so the eye can group nodes by function across cards
// (actors green, the gateways/tunnels cyan, guards purple, live systems orange,
// stores blue, plain inputs/outputs faint). The color only decorates; the label
// carries the meaning, so the diagram is still fully legible without color.
const KIND_COLOR: Record<ArchKind, string> = {
  actor: "var(--color-term-green)",
  gateway: "var(--color-term-cyan)",
  guard: "var(--color-term-purple)",
  system: "var(--color-term-orange)",
  store: "var(--color-term-blue)",
  io: "var(--color-term-faint)",
};

export function ArchDiagram({
  nodes,
  featured = false,
}: {
  nodes: ArchNode[];
  featured?: boolean;
}) {
  // A spoken-word version of the flow for assistive tech, since the arrows and
  // color carry the structure visually.
  const label = `Architecture flow: ${nodes.map((n) => n.label).join(" then ")}`;
  return (
    <div
      role="img"
      aria-label={label}
      className="flex flex-wrap items-center gap-x-1 gap-y-1.5"
    >
      {nodes.map((n, i) => {
        const color = KIND_COLOR[n.kind];
        return (
          <Fragment key={`${n.label}-${i}`}>
            {i > 0 && (
              <span
                aria-hidden
                className={`text-term-faint ${featured ? "text-[11px]" : "text-[10px]"}`}
              >
                -&gt;
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded border border-term-border/70 bg-term-bg/40 text-term-dim ${
                featured ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-0.5 text-[10px]"
              }`}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: color }}
              />
              {n.label}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
