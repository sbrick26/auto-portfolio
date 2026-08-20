#!/usr/bin/env node
// apply-resume-export.mjs - the portfolio side of the career-engine contract.
// The engine emits dist/resume-export.json (schema: career-engine/contracts/
// resume-export.schema.json); this script validates it and splices the resume
// block into content/data.ts between the <resume-export:resume> markers.
// Deterministic and dependency-free: JSON is valid TS object-literal syntax.
//
//   node scripts/apply-resume-export.mjs <export.json>   apply (exit 1 on invalid)
//   node scripts/apply-resume-export.mjs --extract       print current block as export JSON
import { readFileSync, writeFileSync } from "node:fs";

const DATA = new URL("../content/data.ts", import.meta.url).pathname;
const OPEN = /\/\/ <resume-export:resume>[^\n]*\n(?:\/\/[^\n]*\n)*/;
const BLOCK = /(\/\/ <resume-export:resume>[^\n]*\n(?:\/\/[^\n]*\n)*)([\s\S]*?)(\n\/\/ <\/resume-export:resume>)/;

const fail = (msg) => { console.error(`apply-resume-export: ${msg}`); process.exit(1); };

const validate = (x) => {
  if (typeof x !== "object" || x === null) fail("export is not an object");
  if (!Number.isInteger(x.version) || x.version < 1) fail("missing/invalid version");
  if (typeof x.generated !== "string") fail("missing generated timestamp");
  const r = x.resume;
  if (!r || typeof r.summary !== "string" || !r.summary) fail("resume.summary missing");
  for (const key of ["experience", "education"]) {
    if (!Array.isArray(r[key])) fail(`resume.${key} is not an array`);
    for (const e of r[key]) {
      if (typeof e.title !== "string" || !e.title) fail(`${key} entry missing title`);
      if (!Array.isArray(e.points)) fail(`${key} entry '${e.title}' missing points[]`);
      for (const p of e.points) {
        if (typeof p !== "string") fail(`non-string bullet under '${e.title}'`);
        if (p.length > 220) fail(`bullet over 220 chars under '${e.title}': "${p.slice(0, 60)}..."`);
      }
    }
  }
  if (r.experience.length < 1) fail("experience is empty");
};

const src = readFileSync(DATA, "utf8");
const m = src.match(BLOCK);
if (!m) fail("markers not found in content/data.ts");

if (process.argv[2] === "--extract") {
  // current block -> export JSON (round-trip support + engine bootstrap)
  const body = m[2].replace(/^export const resume[^=]*=\s*/, "").replace(/;\s*$/, "")
    .replace(/\] as ResumeItem\[\]/g, "]"); // strip TS casts -> JSON-parseable via eval-free route
  // the literal is JSON-compatible except trailing commas and casts; normalize
  const json = new Function(`return (${body});`)();
  console.log(JSON.stringify({ version: 1, generated: new Date().toISOString(), resume: json }, null, 2));
  process.exit(0);
}

const path = process.argv[2];
if (!path) fail("usage: apply-resume-export.mjs <export.json> | --extract");
const exp = JSON.parse(readFileSync(path, "utf8"));
validate(exp);

const literal = JSON.stringify(exp.resume, null, 2);
const generated =
  `export const resume: { summary: string; experience: ResumeItem[]; education: ResumeItem[] } = ${literal};`;
const out = src.replace(BLOCK, `$1${generated}$3`);
writeFileSync(DATA, out);
console.log(`applied resume export v${exp.version} (${exp.generated}): ` +
  `${exp.resume.experience.length} roles, ${exp.resume.experience.reduce((n, e) => n + e.points.length, 0)} bullets`);
