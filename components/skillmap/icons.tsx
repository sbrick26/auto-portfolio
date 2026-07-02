// Branch icons - the six custom 24x24 line glyphs from the design handoff.
// stroke-only (round caps/joins), colored by the node via currentColor.

import type { ReactNode } from "react";
import type { BranchId } from "@/lib/portfolio-graph";

const PATHS: Record<BranchId, ReactNode> = {
  about: (
    <>
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M5.3 19.3c0-3.7 3-6.3 6.7-6.3s6.7 2.6 6.7 6.3" />
    </>
  ),
  skills: <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />,
  projects: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
  ),
  resume: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.3 9h7.4M8.3 12.6h7.4M8.3 16.2h4.6" />
    </>
  ),
  changelog: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.6v4.4l3 2" />
    </>
  ),
  contact: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <path d="M4 7.2l8 5.8 8-5.8" />
    </>
  ),
};

export function BranchIcon({ id, size = 25 }: { id: BranchId; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
