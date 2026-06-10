import { describe, it, expect } from "vitest";
import { COMMANDS, QUICK, findCommand, canonical } from "@/lib/commands";

describe("findCommand", () => {
  it("finds every command by its own name", () => {
    for (const c of COMMANDS) {
      expect(findCommand(c.name)?.name).toBe(c.name);
    }
  });

  it("resolves aliases to the canonical command", () => {
    expect(findCommand("work")?.name).toBe("updates");
    expect(findCommand("feed")?.name).toBe("updates");
    expect(findCommand("whoami")?.name).toBe("me");
    expect(findCommand("cv")?.name).toBe("resume");
    expect(findCommand("stack")?.name).toBe("skills");
    expect(findCommand("ls")?.name).toBe("projects");
    expect(findCommand("cls")?.name).toBe("clear");
  });

  it("is case-insensitive and ignores surrounding whitespace and args", () => {
    expect(findCommand("  ME  ")?.name).toBe("me");
    expect(findCommand("Updates --tail")?.name).toBe("updates");
  });

  it("returns undefined for unknown or empty input", () => {
    expect(findCommand("sudo")).toBeUndefined();
    expect(findCommand("")).toBeUndefined();
    expect(findCommand("   ")).toBeUndefined();
  });
});

describe("canonical", () => {
  it("maps aliases to canonical names", () => {
    expect(canonical("work")).toBe("updates");
    expect(canonical("WHOAMI")).toBe("me");
  });

  it("returns the lowercased first token for unknown input", () => {
    expect(canonical("Sudo rm")).toBe("sudo");
  });
});

describe("command metadata", () => {
  it("has no duplicate names or aliases across commands", () => {
    const all = COMMANDS.flatMap((c) => [c.name, ...(c.aliases ?? [])]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("every QUICK chip is a real, visible command", () => {
    for (const q of QUICK) {
      const cmd = findCommand(q);
      expect(cmd, `QUICK entry "${q}" must exist`).toBeDefined();
      expect(cmd?.hidden).not.toBe(true);
    }
  });

  it("clear is marked special", () => {
    expect(findCommand("clear")?.special).toBe("clear");
  });

  it("every command has a description", () => {
    for (const c of COMMANDS) {
      expect(c.description.length).toBeGreaterThan(0);
    }
  });
});
