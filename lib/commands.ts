// Pure command metadata (no JSX, so it can be imported anywhere without cycles).
// The name -> renderer mapping lives in components/terminal/outputs.tsx.

export type CommandMeta = {
  name: string;
  description: string;
  aliases?: string[];
  special?: "clear";
  hidden?: boolean;
};

export const COMMANDS: CommandMeta[] = [
  { name: "help", description: "list everything you can do" },
  { name: "me", description: "who I am", aliases: ["whoami"] },
  { name: "about", description: "the longer story" },
  { name: "updates", description: "live feed of what I'm working on", aliases: ["work", "feed"] },
  { name: "skills", description: "skills and proficiency", aliases: ["stack"] },
  { name: "projects", description: "things I've built", aliases: ["ls"] },
  { name: "resume", description: "the one-page resume", aliases: ["cv"] },
  { name: "contact", description: "how to reach me", aliases: ["email"] },
  { name: "clear", description: "clear this tab", aliases: ["cls"], special: "clear" },
  // secret: not in help, chips, palette, or completion. Typing it is the easter egg.
  { name: "version", description: "build version", aliases: ["ver"], hidden: true },
];

// Commands surfaced as quick-tap chips, in order.
export const QUICK = ["me", "about", "updates", "skills", "projects", "resume"];

export function findCommand(input: string): CommandMeta | undefined {
  const name = input.trim().split(/\s+/)[0]?.toLowerCase();
  if (!name) return undefined;
  return COMMANDS.find((c) => c.name === name || c.aliases?.includes(name));
}

// Canonical name for an input (resolves aliases). Returns the raw token if unknown.
export function canonical(input: string): string {
  const found = findCommand(input);
  if (found) return found.name;
  return input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}
