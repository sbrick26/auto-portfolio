# Design system: Warm Paper Grid Tree

The single source of visual truth. Claude Design imports this (with
globals.css + lib/portfolio-graph.ts) via /design-sync; ideation and build
agents build ON it, never against it. Owner rule: evolve, do not replace.

## Voice
Warm paper, editorial serif headlines, quiet mono accents. Calm, precise,
handcrafted. No dark UI, no neon, no glassmorphism.

## Tokens (live source: app/globals.css `--sm-*`)
- Paper: bg gradient #f7f3e9 -> #f3eee3 -> #eee7d8; surface #fbf8f0
- Ink: #2b2620; line rgba(43,35,24,.2)
- Signature accent: teal #127c70 (deep #0b5c53); tint #e3f0ec
- Section accents (lib/portfolio-graph.ts BRANCH_COLOR): about #8c6f93,
  skills #127c70, resume #667fa5, updates #b5853c, changelog #c1715a,
  projects #5f8b63, pipeline #4e7e94, contact #a8677d - all muted,
  paper-friendly, same saturation register.

## Type
- Headlines/card names: Newsreader (serif, 500-600, italic allowed)
- UI/body: Geist Sans; kickers/captions: Space Grotesk or mono, uppercase,
  tracked wide; data/code: Geist Mono / JetBrains Mono

## Form
- Center-card + eight branch tiles on a fixed arc grid; leaves fan
  deterministically; slide-in detail panel (bottom sheet on phones)
- Radius 16-22px cards, hairline borders, soft single shadow
- Motion: gentle idle float, eased fans, no bounce, no parallax; respects
  reduced-motion

## Rules for new work
1. New sections take the next muted accent in the same register.
2. One serif headline per view; mono for metadata only.
3. Dot-grid texture stays subtle (rgba ink at <= .15).
4. Nothing pure white or pure black; everything sits on paper.
