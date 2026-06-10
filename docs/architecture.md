# Architecture and deployment

The infrastructure the pipeline runs on. The companion doc [pipeline.md](pipeline.md)
covers the agent flows that drive it.

## Runtime topology

- **Always-on Mac** - runs the scheduled flows (launchd: 9:30 and 16:00), the Claude
  agents, and the deterministic shell layer (Telegram messaging, run lock, SQLite run
  history, repair loop). Secrets stay here in gitignored, permission-locked `.env`
  files; the repo only ever sees `.env.example`.
- **GitHub** - `sbrick26/auto-portfolio`, public. `main` is the deployed branch,
  protected: required checks (`check` + `e2e`), no force pushes, no deletions.
  Interaction limits keep contributions owner-only; Dependabot is the only other
  trusted PR author. All agent pushes flow through the owner's PAT.
- **AWS (us-east-2)** - two SST v4 stages of the same Next.js app:
  - **production** - CloudFront in front of Lambda (SSR/ISR) and S3 (static assets),
    ACM certificate, Route 53 DNS for `imsway.dev` with a `www` redirect.
  - **preview** - an identical, temporary stage on a plain CloudFront URL, created
    so the owner can test a change before approving it and torn down right after
    the merge deploys. No lingering links, no lingering cost.
- **Telegram** - the owner's control surface: progress narration, a once-a-minute
  heartbeat while work is in flight, and inline approve/reject buttons that gate
  every user-visible change.

## CI

Two required jobs on every PR and push to main:

| job | runs |
|-----|------|
| `check` | eslint, tsc, vitest with coverage thresholds (incl. privacy guards), production build |
| `e2e` | Playwright functional suite, desktop Chrome + Pixel 7, trace artifacts on failure |

Visual-regression screenshot baselines are darwin-only (Linux font rendering flakes)
and run on the Mac, tagged `@visual` and excluded in CI.

## Deploy path

Deploys are driven from the Mac by SST (`npx sst deploy --stage production`), always
from a freshly pulled `main` that has just passed CI, and re-verified locally (tests +
build) before shipping. Every shipped drop bumps the minor version, appends to
`content/changelog.json`, and pushes a `vX.Y.Z` tag.

## Cost posture

Single-digit dollars per month: CloudFront + Lambda + S3 within or near free tier,
Route 53 hosted zone, and the domain ($17/yr). A billing budget alarm guards the
account. Preview stages are torn down after every merge so nothing idles.
