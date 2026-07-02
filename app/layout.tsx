import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { profile } from "@/content/data";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Skill-tree homepage type system: Space Grotesk (UI/labels), JetBrains Mono
// (kickers/captions), Newsreader (the editorial serif on the card + panel title).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jet",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const newsreader = Newsreader({
  variable: "--font-news",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const siteUrl = "https://imsway.dev";
const title = "swayam barik // terminal";
const description =
  "Swayam Barik, AI Solutions Engineer @ IBM. Portfolio, run as a terminal, that ships its own daily improvements through a fleet of agents.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "swayam.os",
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  keywords: [
    "Swayam Barik",
    "AI Solutions Engineer",
    "IBM",
    "watsonx Orchestrate",
    "agentic systems",
    "MCP servers",
    "autonomous agents",
    "software engineer",
    "portfolio",
    "San Francisco",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "swayam.os",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@swayambarik",
  },
};

// Person structured data (schema.org) so search engines can surface an identity
// panel. Only already-public profile facts; mirrors content/data.ts.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: "AI Solutions Engineer",
  url: siteUrl,
  worksFor: { "@type": "Organization", name: "IBM" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    addressCountry: "US",
  },
  sameAs: [profile.links.github, profile.links.linkedin],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${geistSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
