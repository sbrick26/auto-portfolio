# Development

## Build and run

```bash
npm install
npm run dev            # http://localhost:3000
npm run test           # unit + component tests (Vitest + RTL)
npm run test:coverage  # with coverage thresholds (CI runs this)
npm run e2e            # Playwright, desktop + mobile (builds + serves on :3100)
npm run build          # production build
npx sst deploy --stage production   # needs AWS creds in .env
```

## Testing layers

- **Unit + component** - Vitest + React Testing Library. Includes privacy guards
  (no client names, phone numbers, or private emails can ship - fixtures are
  base64-encoded so the public specs do not leak what they forbid) and changelog
  invariants (shape, semver ordering, newest entry matches package.json).
- **Functional e2e** - Playwright on desktop Chrome and Pixel 7: boot, every command,
  tabs, ghost-text, palette, the served-page secret-leak scan.
- **Visual regression** - Playwright screenshot baselines, tagged `@visual`,
  darwin-only (excluded in CI; Linux font rendering flakes).

## The site

A custom React terminal engine (no xterm.js): click-or-type commands (`me`, `about`,
`updates`, `skills`, `projects`, `resume`, `contact`, `changelog`, `help`, aliases,
and one secret), ghost-text autocomplete, editor-style tabs, cmd-K palette, arrow-key
history, an animated live `updates` tail, skills with animated bars + radar chart,
fully responsive.

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
app/  components/  lib/   the Next.js site (terminal engine in components/terminal/)
content/                  data the site renders and the agents append to
test/  e2e/               Vitest suites and Playwright suites
docs/                     architecture + pipeline + development docs
AGENTS.md  CLAUDE.md      agent charters (root by convention - tooling discovers them there)
sst.config.ts             AWS stages (production + preview)
.github/workflows/        CI (check + e2e)
```
