# auto-portfolio

A terminal-style portfolio site that is also a live demonstration of an autonomous,
agent-run development pipeline. The site does not just describe the system. The system
builds, tests, reviews, versions, and ships the site - on its own schedule, every day,
and on demand from the owner's phone.

Live: **[imsway.dev](https://imsway.dev)** · try the `changelog` command (and find the secret one)

**Docs:** [the agent pipeline](docs/pipeline.md) ·
[architecture and deployment](docs/architecture.md) ·
[development](docs/development.md)

## Architecture and deployment

How a change travels: agents work on the Mac, GitHub gates it, AWS serves it, and the
owner approves from a phone.

```mermaid
flowchart LR
    O(["👤 Owner"]) <-->|"texts · screenshots ·<br/>buttons · approvals"| TG["📱 Telegram bot"]
    TG <--> AG

    subgraph mac["🖥️ Always-on Mac · launchd: 9:30 · 16:00 · always-on listener"]
        AG["🤖 Claude agents +<br/>deterministic shell pipeline<br/>one run lock · state · repair loops"]
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
    AG -->|"deploy the PR branch<br/>retry ×3, reason on failure"| PREV
    PREV -->|"preview link in approval"| TG
    AG -->|"approved: squash merge<br/>version + changelog"| MAIN
    MAIN -->|"sst deploy"| CF
    AG -.->|"teardown after merge"| PREV
    V(["🌍 Visitors"]) --> R53
```

## The agents

Six workers under one project lead, three levels with a hard ceiling. Every
user-visible change ends at the same gate: a live preview link plus human approval -
and at every button prompt, a plain text reply steers the plan (rework, rethink,
re-verify) while the buttons alone decide.

```mermaid
flowchart TD
    O(["👤 Owner"]) <-->|"slate buttons · interview ·<br/>approvals · text steering"| TGM["📱 Telegram"]
    TGM <--> FA["Front agent layer<br/>routing · run lock · SQLite state · inbox"]

    FA --> LIS["👂 listener · always on<br/>idle texts + screenshots →<br/>fix now / queue / note buttons"]
    FA --> DAILY["⏰ 9:30 daily improvement"]
    FA --> CHECKIN["⏰ 16:00 check-in"]

    subgraph workers["Portfolio lead + workers · capped loops, never deeper"]
        IDE["💡 ideation<br/>read-only · researches slates<br/>output untrusted"]
        BLD["🔨 build<br/>implements + repairs + reworks<br/>on branches only"]
        REV["🔎 reviewer<br/>judgment only:<br/>scope · correctness · taste"]
        ARC["🗂️ archivist<br/>owns the career hub:<br/>atomic facts, merged not duplicated"]
        RW["📝 resume-writer<br/>honesty contract: every claim<br/>traces to a hub fact"]
        MNT["🩺 maintainer<br/>evidence-only audits +<br/>deterministic privacy syncs"]
    end

    DAILY -->|"slate of 3 ideas"| IDE
    IDE -->|"owner picks 1 / all / rethinks"| BLD
    LIS -->|"fix now → same lifecycle"| BLD
    BLD <-->|"max 5 rounds"| REV
    CHECKIN -->|"interview + metric questions"| ARC
    ARC --> HUB[("career hub<br/>private SQLite + FTS")]
    HUB --> RW
    CHECKIN --> MNT
    MNT -.->|"top finding · re-verifies<br/>on any text reply"| TGM

    BLD --> GATE{"🚦 PR · CI · repair loop<br/>branch-fresh preview<br/>text reply = rework round"}
    RW --> GATE
    GATE -->|"trivial polish"| SHIP["squash merge · version bump<br/>changelog · tag · deploy"]
    GATE -->|"user-visible:<br/>preview + one tap"| TGM
    TGM -->|"approve"| SHIP
    SHIP --> LIVE(["🌍 imsway.dev"])
```

## From a phone, any time

Between scheduled runs, an always-on listener owns the conversation. Texting the bot
an idea - or a screenshot of what should change - starts this:

```mermaid
sequenceDiagram
    actor Owner
    participant TG as 📱 Telegram
    participant L as 👂 Listener
    participant P as 🤖 Pipeline
    participant GH as 🐙 GitHub + CI
    participant AWS as ☁️ AWS

    Owner->>TG: screenshot + "make the footer like this"
    TG->>L: message burst (45s collection)
    L->>Owner: fix now / queue for 9:30 / career note / ignore
    Owner->>L: fix now
    L->>P: full lifecycle, under the run lock
    P->>GH: branch · PR · CI
    P->>AWS: preview stage (PR branch, retry ×3)
    P->>Owner: preview link + approve / reject
    Owner->>P: "move it up a bit" (text = rework)
    P->>AWS: revised preview
    P->>Owner: fresh link + buttons
    Owner->>P: approve
    P->>GH: squash merge · version · tag
    P->>AWS: production deploy + preview teardown
    P->>Owner: shipped and live ✓
    Note over P: a 9:30 / 16:00 run firing meanwhile<br/>waits for the lock - never skipped, never raced
```

## How it runs on its own

- **9:30** - ideation researches a slate of three improvements (owner requests queued
  from the phone take the first slots). Nothing is built until the owner picks one,
  all, or replies with direction for a rethink. Each approved idea then runs the full
  lifecycle: build, agent review, CI, branch-fresh preview, one-tap ship.
- **16:00** - the bot interviews the owner (notes texted anytime fold in from an
  inbox; open metric questions from the career hub lead the conversation), the
  archivist indexes the answers into the hub, the resume-writer refreshes the resume
  only when real achievements changed, Dependabot PRs are processed, and the
  maintainer audits the pipeline itself.
- **Any time** - the listener turns idle texts and screenshots into gated builds,
  queued ideas, or career notes - one tap decides which.
- **Collisions cannot race** - one run lock for everything. A scheduled run that fires
  mid-task waits and then executes its complete normal flow; a wedged lock raises an
  alarm instead of silent waiting.
- **Anything red retries with reasons** - preview deploys retry three times and report
  the real error; ideation retries with its raw output preserved; red CI enters the
  repair loop (conflicts reconciled semantically, capped rounds, never weakening
  tests). If Dependabot's branch is beyond repair, the pipeline re-does the bump
  itself.
- **While anything is in flight** the owner gets a heartbeat ping every minute with
  the current step; it pauses whenever the system is waiting on a human.

Full detail: [docs/pipeline.md](docs/pipeline.md).

## The career data hub

The 16:00 interview feeds a private structured index (SQLite + FTS, outside this
repo): every job, project, and achievement as an atomic fact with action, impact,
metrics, and provenance. New material merges into existing facts instead of
duplicating them, and achievements missing a number generate follow-up questions for
the owner rather than invented figures. The resume-writer works only from this hub
under a written honesty contract: no claim without a fact, numbers only direct or
transparently estimated, and client engagements always described anonymously
("a Fortune 500 trucking company"), never by name.

## Guardrails

- Agents act only on instructions from the owner (or Dependabot bumps). External PRs,
  issues, and comments are untrusted input - reported, never obeyed.
- Deterministic checks are scripts and CI, never agent judgment. Human merge is the
  final gate for anything user-visible; text replies steer, buttons decide.
- Privacy guards run in CI: a leak-scan blocks client names (auto-hardened daily from
  a private registry), no phone numbers, no private emails. Secrets live only in
  local `.env` files, never in the repo.
- Every loop is hard-capped. A maintainer fix that breaks anything pauses the pipeline.

## Quick start

```bash
npm install
npm run dev    # http://localhost:3000
npm run test   # unit + component suites
```

More in [docs/development.md](docs/development.md).
