// Pure helper behind the `pipeline` command: the deterministic step sequence the
// renderer animates a token through. The diagram shows the actual system that
// builds and ships this site - owner -> front agent -> portfolio lead ->
// ideation/build/reviewer -> GitHub CI -> branch preview -> approval -> AWS prod.
//
// The architecture (the node sequence) is fixed; the run-specific values - the
// idea text, the shipped version, the date - are pulled from the real changelog
// feed so the flourish is also true. Same input -> same output, so it is
// unit-testable and the render never drifts (same contract as lib/activity.ts).
// The render layer lives in components/terminal/PipelineDiagram.tsx.

import { changelog, type ChangelogEntry } from "@/content/data";

// Which level of the org chart a node sits at - drives nothing but grouping and
// the legend, but keeps the "3 levels, hard ceiling" architecture legible.
export type PipelineActor = "owner" | "front" | "lead" | "worker" | "ci" | "cloud";

// One node in the path. `token` is what the traveling pulse is carrying as it
// LEAVES this node - the artifact that moves to the next stage (idea -> branch ->
// review -> PR -> green CI -> preview -> approval -> prod).
export type PipelineStage = {
  key: string;
  node: string;
  detail: string;
  token: string;
  actor: PipelineActor;
  accent: string; // a --color-term-* css var
};

export type PipelineRun = {
  version: string; // the shipped version this run produced
  date: string; // YYYY-MM-DD it shipped
  idea: string; // the headline change, straight from the changelog
  stages: PipelineStage[];
};

// Keep one short line of changelog prose readable as a token caption without
// letting a long entry blow out the layout.
// 76 chars is what fits the run card's fixed two-line box (see .sm-run in
// globals.css); staying under it keeps the CSS line-clamp from adding a second
// ellipsis on top of this one.
function clamp(text: string, max = 76): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * Build the pipeline run the diagram animates.
 *
 * The node sequence is the real org chart and lifecycle; only the run-specific
 * values (idea / version / date) come from the latest changelog entry, so the
 * animation tells the truth about the most recent self-deploy. An empty feed
 * falls back to neutral placeholders rather than throwing.
 */
export function buildPipelineRun(log: ChangelogEntry[]): PipelineRun {
  const latest = log[0];
  const version = latest?.version ?? "0.0.0";
  const date = latest?.date ?? "";
  const idea = clamp(latest?.changes[0] ?? "a daily improvement");

  const stages: PipelineStage[] = [
    {
      key: "owner",
      node: "owner",
      detail: "you, over Telegram",
      token: "idea",
      actor: "owner",
      accent: "var(--color-term-cyan)",
    },
    {
      key: "front",
      node: "front agent",
      detail: "routes the work, owns shared state",
      token: "routed",
      actor: "front",
      accent: "var(--color-term-green)",
    },
    {
      key: "lead",
      node: "portfolio lead",
      detail: "sequences the workers, holds the guardrails",
      token: "scoped",
      actor: "lead",
      accent: "var(--color-term-green)",
    },
    {
      key: "ideation",
      node: "ideation",
      detail: "proposes one useful change",
      token: "proposal",
      actor: "worker",
      accent: "var(--color-term-orange)",
    },
    {
      key: "build",
      node: "build",
      detail: "implements it on a feature branch",
      token: "branch",
      actor: "worker",
      accent: "var(--color-term-purple)",
    },
    {
      key: "reviewer",
      node: "reviewer",
      detail: "judges APPROVE / REQUEST_CHANGES",
      token: "reviewed",
      actor: "worker",
      accent: "var(--color-term-yellow)",
    },
    {
      key: "ci",
      node: "GitHub CI",
      detail: "eslint · tsc · vitest · build",
      token: "green",
      actor: "ci",
      accent: "var(--color-term-blue)",
    },
    {
      key: "preview",
      node: "branch preview",
      detail: "a deploy to inspect before prod",
      token: "preview",
      actor: "cloud",
      accent: "var(--color-term-blue)",
    },
    {
      key: "approval",
      node: "your approval",
      detail: "one tap - the final human gate",
      token: "approved",
      actor: "owner",
      accent: "var(--color-term-cyan)",
    },
    {
      key: "deploy",
      node: "AWS · imsway.dev",
      detail: "shipped through SST to CloudFront",
      token: `v${version}`,
      actor: "cloud",
      accent: "var(--color-term-green)",
    },
  ];

  return { version, date, idea, stages };
}

// The live run the `pipeline` command renders, off the real changelog feed.
export const pipelineRun: PipelineRun = buildPipelineRun(changelog);
