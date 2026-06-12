import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { profile } from "@/content/data";

// Shared by both the Open Graph and Twitter cards (twitter-image re-exports this).
export const alt =
  "swayam.os terminal: Swayam Barik, AI Solutions Engineer @ IBM. Portfolio run as a terminal.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Terminal palette, kept in sync with app/globals.css.
const term = {
  bg: "#181c26",
  panel: "#1d222e",
  border: "#424a5e",
  text: "#edf0f5",
  dim: "#a3acbc",
  faint: "#717a8b",
  green: "#7ef0ac",
  cyan: "#66e2eb",
  red: "#ff7e7e",
  yellow: "#f0cd88",
};

// ImageResponse renders with satori: flexbox-only, no CSS grid, woff2 unsupported.
// A single committed Geist Mono weight keeps the bundle well under the 500KB limit.
export default async function Image() {
  const geistMono = await readFile(
    join(process.cwd(), "assets/GeistMono-Regular.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          background: `radial-gradient(1100px 520px at 50% -8%, #2b3144 0%, ${term.bg} 62%)`,
          fontFamily: "Geist Mono",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            borderRadius: 16,
            border: `1px solid ${term.border}`,
            background: term.panel,
            overflow: "hidden",
          }}
        >
          {/* title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "20px 28px",
              borderBottom: `1px solid ${term.border}`,
            }}
          >
            <div
              style={{ width: 16, height: 16, borderRadius: 16, background: term.red }}
            />
            <div
              style={{ width: 16, height: 16, borderRadius: 16, background: term.yellow }}
            />
            <div
              style={{ width: 16, height: 16, borderRadius: 16, background: term.green }}
            />
            <div style={{ marginLeft: 16, fontSize: 24, color: term.faint }}>
              swayam.os — portfolio
            </div>
          </div>

          {/* body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              padding: "0 56px",
            }}
          >
            <div style={{ display: "flex", fontSize: 30, color: term.dim }}>
              <span style={{ color: term.green }}>swayam@portfolio</span>
              <span style={{ color: term.faint }}>:~$</span>
              <span style={{ marginLeft: 16, color: term.text }}>whoami</span>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 92,
                fontWeight: 700,
                color: term.text,
                marginTop: 20,
              }}
            >
              {profile.name}
            </div>

            <div
              style={{ display: "flex", fontSize: 40, color: term.cyan, marginTop: 8 }}
            >
              {profile.role}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 30,
                color: term.dim,
                marginTop: 28,
              }}
            >
              <span style={{ color: term.green }}>$</span>
              <span style={{ marginLeft: 16 }}>portfolio run as a terminal</span>
              <div
                style={{
                  width: 18,
                  height: 32,
                  marginLeft: 10,
                  background: term.green,
                }}
              />
            </div>
          </div>

          {/* footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "22px 56px",
              borderTop: `1px solid ${term.border}`,
              fontSize: 26,
              color: term.faint,
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
        {
          name: "Geist Mono",
          data: geistMono,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
