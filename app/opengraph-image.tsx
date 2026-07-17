import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { profile } from "@/content/data";

// Shared by both the Open Graph and Twitter cards (twitter-image re-exports this).
export const alt =
  "swayam.map: Swayam Barik, AI Solutions Engineer @ IBM. An interactive skill-map portfolio that ships its own improvements through a fleet of agents.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Warm Paper Grid Tree palette, kept in sync with app/globals.css (--sm-*)
// and lib/portfolio-graph.ts BRANCH_COLOR.
const paper = {
  bgTop: "#f7f3e9",
  bgBottom: "#eee7d8",
  surface: "#fbf8f0",
  ink: "#2b2620",
  faint: "rgba(43, 38, 32, 0.55)",
  line: "rgba(43, 35, 24, 0.2)",
  teal: "#127c70",
  tealDeep: "#0b5c53",
};

// One node per site branch, in its section color (BRANCH_COLOR order).
const NODES = [
  "#8c6f93", // about
  "#127c70", // skills
  "#667fa5", // resume
  "#b5853c", // updates
  "#c1715a", // changelog
  "#5f8b63", // projects
  "#4e7e94", // pipeline
  "#a8677d", // contact
];

// ImageResponse renders with satori: flexbox-only, no CSS grid, woff2 unsupported.
// Two committed single-weight TTFs (Newsreader for the headline serif, Geist Mono
// for kickers) keep the render self-contained.
export default async function Image() {
  const [newsreader, geistMono] = await Promise.all([
    readFile(join(process.cwd(), "assets/Newsreader-Medium.ttf")),
    readFile(join(process.cwd(), "assets/GeistMono-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 56,
          background: `linear-gradient(175deg, ${paper.bgTop} 0%, ${paper.bgBottom} 100%)`,
          fontFamily: "Newsreader",
        }}
      >
        {/* the center card, echoing the map's me-card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            borderRadius: 20,
            border: `1px solid ${paper.line}`,
            background: paper.surface,
            overflow: "hidden",
          }}
        >
          {/* header strip: wordmark + branch nodes */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "22px 40px",
              borderBottom: `1px solid ${paper.line}`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Geist Mono",
                fontSize: 24,
                color: paper.tealDeep,
              }}
            >
              swayam.map
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {NODES.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 16,
                    background: c,
                  }}
                />
              ))}
            </div>
          </div>

          {/* body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              padding: "0 64px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Geist Mono",
                fontSize: 26,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: paper.faint,
              }}
            >
              interactive skill map
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 96,
                color: paper.ink,
                marginTop: 16,
              }}
            >
              {profile.name}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 4,
                  background: paper.teal,
                  borderRadius: 4,
                  marginRight: 18,
                }}
              />
              <div style={{ display: "flex", fontSize: 40, color: paper.tealDeep }}>
                {profile.role}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: paper.faint,
                marginTop: 26,
              }}
            >
              a portfolio that ships its own improvements through a fleet of agents
            </div>
          </div>

          {/* footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "22px 64px",
              borderTop: `1px solid ${paper.line}`,
              fontFamily: "Geist Mono",
              fontSize: 24,
              color: paper.faint,
            }}
          >
            <span>imsway.dev</span>
            <span>{profile.location}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: newsreader, style: "normal", weight: 500 },
        { name: "Geist Mono", data: geistMono, style: "normal", weight: 400 },
      ],
    }
  );
}
