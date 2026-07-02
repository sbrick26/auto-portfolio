// Branch icons - the eight custom 24x24 line glyphs (six from the design
// handoff plus updates/pipeline). stroke-only (round caps/joins), colored by
// the node via currentColor.

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
  updates: <path d="M2.5 12h3.4l2.6-6.5 3.2 13 2.8-9 1.9 2.5h5.1" />,
  pipeline: (
    <>
      <path d="M20.5 11a8.6 8.6 0 0 0-16.2-2.4" />
      <path d="M4.6 4.2v4.6h4.6" />
      <path d="M3.5 13a8.6 8.6 0 0 0 16.2 2.4" />
      <path d="M19.4 19.8v-4.6h-4.6" />
    </>
  ),
  contact: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <path d="M4 7.2l8 5.8 8-5.8" />
    </>
  ),
};

// Pipeline stage glyphs (one per lifecycle step), same stroke language as the
// branch icons so the animated walk reads as part of the map.
const PIPE_PATHS: Record<string, ReactNode> = {
  owner: (
    <>
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M5.3 19.3c0-3.7 3-6.3 6.7-6.3s6.7 2.6 6.7 6.3" />
    </>
  ),
  front: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9V4M14.6 13.5l4.4 2.6M9.4 13.5L5 16.1" />
    </>
  ),
  lead: <path d="M6 21V4h11l-2.5 4L17 12H6" />,
  ideation: (
    <>
      <path d="M12 3a6 6 0 0 0-3.4 10.9c.9.7 1.4 1.6 1.4 2.6h4c0-1 .5-1.9 1.4-2.6A6 6 0 0 0 12 3z" />
      <path d="M10 19.5h4M10.8 22h2.4" />
    </>
  ),
  build: <path d="M14.5 6.5a4 4 0 0 1 5-5l-3 3 .6 2.4 2.4.6 3-3a4 4 0 0 1-5 5L8 19a2.1 2.1 0 1 1-3-3z" />,
  reviewer: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5.5 5.5" />
    </>
  ),
  ci: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.2 12.3l2.6 2.6 5-5.2" />
    </>
  ),
  preview: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  approval: <path d="M7 11v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM7 12l3.8-7.6a2 2 0 0 1 1.9 2V9h5.2a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7" />,
  deploy: (
    <>
      <path d="M12 15V4" />
      <path d="M8.5 7.5L12 4l3.5 3.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
};

export function PipeIcon({ k, size = 16 }: { k: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PIPE_PATHS[k] ?? PIPE_PATHS.front}
    </svg>
  );
}

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
