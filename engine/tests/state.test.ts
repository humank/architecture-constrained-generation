import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import {
  emptyState,
  loadState,
  refreshCursor,
  saveState,
  setScope,
  transition,
} from "../src/state.ts";
import { statePath } from "../src/paths.ts";
import { cleanup, scratchRoot } from "./helpers.ts";

const roots: string[] = [];
function root(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

function complete(id = "00-requirements") {
  const s = emptyState();
  transition(s, id, "in_progress");
  transition(s, id, "awaiting_approval");
  transition(s, id, "completed");
  return s;
}

describe("six-state machine", () => {
  test("happy path pending → in_progress → awaiting → completed", () => {
    expect(complete().phases["00-requirements"].state).toBe("completed");
  });

  test("rejects illegal completed → in_progress", () => {
    const s = complete();
    expect(() => transition(s, "00-requirements", "in_progress")).toThrow(/Illegal transition/);
  });

  test("rejects illegal pending → completed", () => {
    const s = emptyState();
    expect(() => transition(s, "00-requirements", "completed")).toThrow(/Illegal transition/);
  });

  test("rejects illegal pending → awaiting_approval", () => {
    const s = emptyState();
    expect(() => transition(s, "00-requirements", "awaiting_approval")).toThrow(
      /Illegal transition/,
    );
  });

  test("redo is completed → pending, and clears the record", () => {
    const s = complete();
    s.phases["00-requirements"].blockers = [
      { sensor: "x", status: "fail", blocking: true, message: "m" },
    ];
    transition(s, "00-requirements", "pending");
    expect(s.phases["00-requirements"].state).toBe("pending");
    expect(s.phases["00-requirements"].completed_at).toBeNull();
    expect(s.phases["00-requirements"].blockers).toEqual([]);
  });

  test("rejection path awaiting → revising → awaiting", () => {
    const s = emptyState();
    transition(s, "00-requirements", "in_progress");
    transition(s, "00-requirements", "awaiting_approval");
    transition(s, "00-requirements", "revising");
    transition(s, "00-requirements", "awaiting_approval");
    expect(s.phases["00-requirements"].state).toBe("awaiting_approval");
  });

  test("an unknown phase cannot be transitioned", () => {
    expect(() => transition(emptyState(), "99-nope", "in_progress")).toThrow(/not in state/);
  });
});

describe("cursor", () => {
  test("cursor stops at the first phase that is neither completed nor skipped", () => {
    const s = emptyState();
    transition(s, "00-requirements", "skipped");
    transition(s, "01a-dst", "in_progress");
    refreshCursor(s);
    expect(s.cursor).toEqual({ phase: "01a-dst", state: "in_progress" });
  });

  test("cursor is done when every phase is completed or skipped", () => {
    const s = emptyState();
    for (const id of Object.keys(s.phases)) transition(s, id, "skipped");
    refreshCursor(s);
    expect(s.cursor).toEqual({ phase: null, state: "done" });
  });
});

describe("scope", () => {
  test("the patch scope carries only its own phases", () => {
    const s = emptyState("coffeeshop", "patch");
    expect(Object.keys(s.phases)).toEqual([
      "03-tactical",
      "04-specification",
      "08-implementation",
    ]);
  });

  test("switching scope keeps the state of shared phases", () => {
    const s = complete("03-tactical");
    const patched = setScope(s, "patch");
    expect(patched.scope).toBe("patch");
    expect(patched.phases["03-tactical"].state).toBe("completed");
    expect(patched.phases["00-requirements"]).toBeUndefined();
  });
});

describe("engine write guard", () => {
  test("saveState refuses to write without the engine marker", () => {
    const r = root();
    const previous = process.env.ACG_ENGINE;
    delete process.env.ACG_ENGINE;
    try {
      expect(() => saveState(emptyState(), r)).toThrow(/owned by acg\.ts/);
      expect(existsSync(statePath(r))).toBe(false);
    } finally {
      process.env.ACG_ENGINE = previous;
    }
  });

  test("saveState writes and reloads with the marker set", () => {
    const r = root();
    saveState(complete(), r);
    expect(readFileSync(statePath(r), "utf8")).toContain("00-requirements");
    expect(loadState(r).phases["00-requirements"].state).toBe("completed");
  });
});
