# Development

## Build and run

```bash
npm install
npm run dev            # http://localhost:3000
npm run test           # unit + component tests (Vitest + RTL)
npm run test:coverage  # with coverage thresholds (CI runs this)
npm run e2e            # Playwright, desktop + mobile (builds + serves on :3100)
npm run build          # production build
# production deploys run ONLY in CI (GitHub Actions + OIDC) - see architecture.md
```

## Testing layers

- **Unit + component** - Vitest + React Testing Library. Includes privacy guards
  (no client names, phone numbers, or private emails can ship - fixtures are
  base64-encoded so the public specs do not leak what they forbid) and changelog
  invariants (shape, semver ordering, newest entry matches package.json).
- **Functional e2e** - Playwright on desktop Chrome and Pixel 7: the skill map,
  node panels, deep links, resume one-page gate, and the served-page
  secret-leak scan.
- **Visual regression** - Playwright screenshot baselines, tagged `@visual`,
  darwin-only (excluded in CI; Linux font rendering flakes).

## The site

An interactive skill map in the "Warm Paper Grid Tree" design (design-system.md):
a branching node map of roles, projects, and skills where each section carries its
own muted accent color, node panels open with shareable deep links, and the
updates feed, resume, and changelog render from `content/`. Fully responsive;
the resume page is the source for the downloadable one-page PDF.

**Stack:** Next.js (App Router) · React · TypeScript · Tailwind v4 · Framer Motion ·
Recharts · Vitest + RTL · Playwright · SST v4 on AWS · GitHub Actions · Claude Code
agents

## Content seams (what the agents write to)

- `content/updates.json` - the live feed; grows freely
- `content/changelog.json` - one entry per shipped version
- `content/data.ts` - profile, skills, projects, resume; the resume changes only
  when warranted
- The career corpus lives outside this repo and never ships

## Repo layout

```
app/  components/  lib/   the Next.js site (skill map in components/skillmap/)
content/                  data the site renders and the agents append to
test/  e2e/               Vitest suites and Playwright suites
docs/                     architecture + pipeline + development docs
AGENTS.md  CLAUDE.md      agent charters (root by convention - tooling discovers them there)
sst.config.ts             AWS stages (production + preview)
.github/workflows/        CI (check + e2e)
```
