#!/usr/bin/env node
// apply-showcase-export.mjs - consume swaygent's living case-study data
// (dist/showcase-export.json) into content/showcase.json. Validation + copy
// only; rendering is the design epic's job. Zero deps.
import { readFileSync, writeFileSync } from "node:fs";
const src = process.argv[2];
if (!src) { console.error("usage: apply-showcase-export.mjs <export.json>"); process.exit(1); }
const d = JSON.parse(readFileSync(src, "utf8"));
const fail = (m) => { console.error(`showcase export invalid: ${m}`); process.exit(1); };
if (!Number.isInteger(d.version)) fail("version");
if (!Array.isArray(d.projects) || !d.projects.length) fail("projects");
for (const p of d.projects) {
  for (const k of ["id", "name", "oneliner", "stack", "stats", "diagram"])
    if (!(k in p)) fail(`project ${p.id || "?"} missing ${k}`);
  if (p.oneliner.length > 220) fail(`${p.id} oneliner too long`);
}
writeFileSync(new URL("../content/showcase.json", import.meta.url).pathname,
  JSON.stringify(d, null, 2) + "\n");
console.log(`showcase.json updated: ${d.projects.length} projects @ ${d.generated}`);
