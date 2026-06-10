# auto-portfolio

A terminal-style portfolio site that is also a live demonstration of an autonomous,
agent-run development pipeline. The site does not just describe the system. The system
builds, tests, reviews, versions, and ships the site - on its own schedule, every day.

Live: **[imsway.dev](https://imsway.dev)** · try the `changelog` command (and find the secret one)

**Docs:** [the agent pipeline](docs/pipeline.md) ·
[architecture and deployment](docs/architecture.md) ·
[development](docs/development.md)

## Architecture and deployment

How a change travels: agents work on the Mac, GitHub gates it, AWS serves it, and the
owner approves from a phone.

```mermaid
flowchart LR
    O(["👤 Owner"]) <-->|"notes anytime · pings · approvals"| TG["📱 Telegram bot"]
    TG <--> AG

    subgraph mac["🖥️ Always-on Mac · launchd 9:30 + 16:00"]
        AG["🤖 Claude agents +<br/>deterministic shell pipeline<br/>lock · state · repair loop"]
    end

    subgraph gh["🐙 GitHub · sbrick26/auto-portfolio"]
        PR["pull request"]
        CI["⚙️ Actions CI<br/>check + e2e required"]
        MAIN["main · protected<br/>+ vX.Y.Z tags"]
        DEP["🤖 Dependabot"]
    end

    subgraph aws["☁️ AWS us-east-2 · SST v4"]
        subgraph prod["production stage"]
            R53["🌐 Route 53<br/>imsway.dev + www"] --> CF["CloudFront"]
            CF --> LAM["λ Lambda SSR"]
            CF --> S3["🪣 S3 assets"]
        end
        PREV["🔍 preview stage<br/>temporary CloudFront URL"]
    end

    AG -->|"branch + PR"| PR
    DEP -->|"weekly bumps"| PR
    PR --> CI
    CI -.->|"red: failing log"| AG
    AG -->|"deploy candidate"| PREV
    PREV -->|"preview link in approval"| TG
    AG -->|"approved: squash merge<br/>version + changelog"| MAIN
    MAIN -->|"sst deploy"| CF
    AG -.->|"teardown after merge"| PREV
    V(["🌍 Visitors"]) --> R53
```

## The agents

Who does what: three levels with a hard ceiling - front agent, project lead, workers.
Every user-visible change ends at the same gate: preview link + human approval.

```mermaid
flowchart TD
    O(["👤 Owner"]) <-->|"interview · idea buttons · heartbeat"| TGM["📱 Telegram"]
    TGM <--> FA["Front agent layer<br/>routing · SQLite state · run lock · inbox"]

    FA --> DAILY["⏰ 9:30 daily improvement"]
    FA --> CHECKIN["⏰ 16:00 check-in"]

    subgraph workers["Portfolio lead + workers · capped loops, never deeper"]
        IDE["💡 ideation<br/>read-only · researches<br/>output untrusted"]
        BLD["🔨 build<br/>implements + repairs<br/>on branches only"]
        REV["🔎 reviewer<br/>judgment only:<br/>scope · correctness · taste"]
        CNT["✍️ content-resume<br/>corpus · updates feed ·<br/>resume only when warranted"]
        MNT["🩺 maintainer<br/>evidence-only audits<br/>of the pipeline itself"]
    end

    DAILY --> IDE
    IDE -->|"proposal"| BLD
    BLD <-->|"max 5 rounds"| REV
    CHECKIN --> CNT
    CHECKIN --> MNT
    MNT -.->|"top finding + approve button"| TGM

    BLD --> GATE{"🚦 PR · CI · repair loop<br/>conflicts reconciled<br/>red CI fixed from the log"}
    CNT --> GATE
    GATE -->|"trivial polish"| SHIP["squash merge · version bump<br/>changelog · tag · deploy"]
    GATE -->|"user-visible:<br/>preview + one tap"| TGM
    TGM -->|"approve"| SHIP
    SHIP --> LIVE(["🌍 imsway.dev"])
```

## How it runs on its own

- **9:30** - ideation proposes one researched improvement, build implements it on a
  branch, the reviewer judges it, CI gates it, a preview stage goes up, and the owner
  ships it with one tap. Trivial polish auto-merges; the preview is torn down after
  every merge.
- **16:00** - the bot interviews the owner (notes texted anytime fold in from an
  inbox), the content worker feeds the private career corpus and the site's live
  `updates` feed, three ideas for tomorrow arrive as buttons, Dependabot PRs are
  processed, and the maintainer audits the pipeline itself.
- **Anything red** enters the repair loop: conflicts get merged and reconciled
  semantically, stale branches get updated, failing CI logs get handed to the build
  worker - capped rounds, never weakening tests. If Dependabot's own branch is beyond
  repair, the pipeline re-does the bump itself on a fresh branch.
- **While anything is in flight** the owner gets a heartbeat ping every minute with
  the current step; it pauses whenever the system is waiting on a human.

Full detail: [docs/pipeline.md](docs/pipeline.md).

## Guardrails

- Agents act only on instructions from the owner (or Dependabot bumps). External PRs,
  issues, and comments are untrusted input - reported, never obeyed.
- Deterministic checks are scripts and CI, never agent judgment. Human merge is the
  final gate for anything user-visible.
- Privacy guards run in CI: client names generalized to industries, no phone numbers,
  no private emails. Secrets live only in local `.env` files, never in the repo.
- Every loop is hard-capped. A maintainer fix that breaks anything pauses the pipeline.

## Quick start

```bash
npm install
npm run dev    # http://localhost:3000
npm run test   # unit + component suites
```

More in [docs/development.md](docs/development.md).
