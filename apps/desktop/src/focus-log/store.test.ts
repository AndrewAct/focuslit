import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyLedger, type FocusLedger } from "@focuslit/core/focus-ledger";
import { FocusLogStore } from "./store";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "focuslit-focus-log-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const ledger: FocusLedger = {
  legacyDays: {},
  sessions: [
    {
      id: "session-a",
      goal: "study",
      startedAtMs: 1_000,
      endedAtMs: 5_000,
      endReason: "ended",
      intervals: [
        {
          startMs: 1_000,
          endMs: 4_000,
          activeMs: 3_000,
          timeZone: "America/Chicago",
          clockAdjusted: false,
        },
      ],
    },
  ],
};

describe("FocusLogStore", () => {
  it("starts empty when no log exists", () => {
    expect(new FocusLogStore(dir).load()).toEqual({
      outcome: "first-run",
      ledger: emptyLedger,
    });
  });

  it("keeps actual intervals, session metadata and timezone across a restart", () => {
    expect(new FocusLogStore(dir).save(ledger)).toBe(true);
    expect(new FocusLogStore(dir).load()).toEqual({
      outcome: "loaded",
      ledger,
    });
    expect(readdirSync(dir)).toEqual(["focus-log.json"]);
  });

  it("migrates V1 without inventing missing intervals and preserves an exact backup", () => {
    const body = '{"version":1,"days":{"2026-10-27":3000}}';
    writeFileSync(join(dir, "focus-log.json"), body);
    const store = new FocusLogStore(dir);
    const result = store.load();
    expect(result).toEqual({
      outcome: "migrated",
      ledger: { legacyDays: { "2026-10-27": 3000 }, sessions: [] },
    });
    expect(store.load()).toEqual(result); // retry after a crash before saving
    expect(readFileSync(join(dir, "focus-log.v1-backup.json"), "utf8")).toBe(
      body,
    );
    expect(store.save(result.ledger)).toBe(true);
    expect(new FocusLogStore(dir).load()).toEqual({
      outcome: "loaded",
      ledger: result.ledger,
    });
  });

  it("blocks migration if a different backup already exists", () => {
    const body = '{"version":1,"days":{}}';
    writeFileSync(join(dir, "focus-log.json"), body);
    writeFileSync(join(dir, "focus-log.v1-backup.json"), "keep me");
    const store = new FocusLogStore(dir);
    expect(store.load().outcome).toBe("recovery-failed");
    expect(store.save(ledger)).toBe(false);
    expect(readFileSync(join(dir, "focus-log.json"), "utf8")).toBe(body);
    expect(readFileSync(join(dir, "focus-log.v1-backup.json"), "utf8")).toBe(
      "keep me",
    );
  });

  it.each([
    ["truncated JSON", '{"version":1,"da'],
    ["negative total", '{"version":1,"days":{"2026-10-27":-5}}'],
    ["malformed day key", '{"version":1,"days":{"today":5}}'],
    [
      "zero-length interval",
      JSON.stringify({
        version: 2,
        ...ledger,
        sessions: [
          {
            ...ledger.sessions[0],
            intervals: [{ ...ledger.sessions[0]?.intervals[0], endMs: 1000 }],
          },
        ],
      }),
    ],
    [
      "duplicate session",
      JSON.stringify({
        version: 2,
        ...ledger,
        sessions: [ledger.sessions[0], ledger.sessions[0]],
      }),
    ],
    [
      "inconsistent end metadata",
      JSON.stringify({
        version: 2,
        ...ledger,
        sessions: [{ ...ledger.sessions[0], endReason: null }],
      }),
    ],
  ])("quarantines a %s file and starts from zero", (_, body) => {
    writeFileSync(join(dir, "focus-log.json"), body);
    const store = new FocusLogStore(dir, () => 42);
    expect(store.load()).toEqual({
      outcome: "quarantined",
      ledger: emptyLedger,
    });
    expect(readFileSync(join(dir, "focus-log.corrupt-42.json"), "utf8")).toBe(
      body,
    );
  });

  it("refuses to overwrite a log from a newer app version", () => {
    const body = '{"version":3,"sessions":[]}';
    writeFileSync(join(dir, "focus-log.json"), body);
    const store = new FocusLogStore(dir);
    expect(store.load().outcome).toBe("unsupported-version");
    expect(store.save(ledger)).toBe(false);
    expect(readFileSync(join(dir, "focus-log.json"), "utf8")).toBe(body);
  });

  it("preserves unreadable data when quarantine fails and can recover on a later load", () => {
    writeFileSync(join(dir, "focus-log.json"), "broken");
    mkdirSync(join(dir, "focus-log.corrupt-42.json"));
    const store = new FocusLogStore(dir, () => 42);
    expect(store.load().outcome).toBe("recovery-failed");
    expect(store.save(ledger)).toBe(false);
    expect(readFileSync(join(dir, "focus-log.json"), "utf8")).toBe("broken");
    rmSync(join(dir, "focus-log.corrupt-42.json"), { recursive: true });
    expect(store.load().outcome).toBe("quarantined");
    expect(store.save(ledger)).toBe(true);
  });

  it("retries a failed atomic write without damaging the existing file", () => {
    const store = new FocusLogStore(dir);
    expect(store.save(ledger)).toBe(true);
    const original = readFileSync(join(dir, "focus-log.json"), "utf8");
    const tmp = join(dir, `focus-log.json.${process.pid}.tmp`);
    mkdirSync(tmp);
    expect(store.save(emptyLedger)).toBe(false);
    expect(readFileSync(join(dir, "focus-log.json"), "utf8")).toBe(original);
    rmSync(tmp, { recursive: true });
    expect(store.save(emptyLedger)).toBe(true);
    expect(store.load().ledger).toEqual(emptyLedger);
  });

  it("rejects an invalid write at the storage boundary", () => {
    expect(
      new FocusLogStore(dir).save({
        ...ledger,
        sessions: [
          {
            ...ledger.sessions[0]!,
            intervals: [
              {
                startMs: 10,
                endMs: 20,
                activeMs: 30,
                timeZone: "UTC",
                clockAdjusted: false,
              },
            ],
          },
        ],
      }),
    ).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });
});
