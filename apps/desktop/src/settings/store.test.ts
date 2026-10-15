import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SettingsStore } from "./store";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "focuslit-settings-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("SettingsStore", () => {
  it("treats a missing file as first run with no language chosen", () => {
    const store = new SettingsStore(dir);

    expect(store.load()).toBe("first-run");
    expect(store.get()).toEqual({ locale: null });
  });

  it("persists a language choice across a restart", async () => {
    const first = new SettingsStore(dir);
    first.load();
    await first.update({ locale: "en" });

    const restarted = new SettingsStore(dir);
    expect(restarted.load()).toBe("loaded");
    expect(restarted.get()).toEqual({ locale: "en" });
  });

  it.each([
    ["truncated JSON", '{"version":1,"loc'],
    ["unknown locale", '{"version":1,"locale":"fr"}'],
    ["extra fields", '{"version":1,"locale":"zh","apiKey":"x"}'],
  ])("quarantines a %s file and asks again instead of guessing", (_, body) => {
    writeFileSync(join(dir, "settings.json"), body);
    const store = new SettingsStore(dir, () => 42);

    expect(store.load()).toBe("quarantined");
    expect(store.get()).toEqual({ locale: null });
    expect(readdirSync(dir)).toEqual(["settings.corrupt-42.json"]);
    expect(readFileSync(join(dir, "settings.corrupt-42.json"), "utf8")).toBe(
      body,
    );
  });

  it("preserves an unknown settings version and refuses to replace it", async () => {
    const body = '{"version":2,"locale":"zh","newPreference":true}';
    writeFileSync(join(dir, "settings.json"), body);
    const store = new SettingsStore(dir);

    expect(store.load()).toBe("unsupported-version");
    await expect(store.update({ locale: "en" })).rejects.toThrow();
    expect(store.get()).toEqual({ locale: null });
    expect(readdirSync(dir)).toEqual(["settings.json"]);
    expect(readFileSync(join(dir, "settings.json"), "utf8")).toBe(body);
  });

  it("blocks replacement if quarantine fails and recovers after a safe backup", async () => {
    const body = '{"version":1,"loc';
    writeFileSync(join(dir, "settings.json"), body);
    const blocker = join(dir, "settings.corrupt-42.json");
    mkdirSync(blocker);
    const store = new SettingsStore(dir, () => 42);

    expect(store.load()).toBe("recovery-failed");
    await expect(store.update({ locale: "en" })).rejects.toThrow();
    expect(readFileSync(join(dir, "settings.json"), "utf8")).toBe(body);

    rmSync(blocker, { recursive: true });
    expect(store.load()).toBe("quarantined");
    await expect(store.update({ locale: "en" })).resolves.toEqual({
      locale: "en",
    });
    expect(readFileSync(blocker, "utf8")).toBe(body);
  });

  it("applies concurrent updates in order and leaves no temp file", async () => {
    const store = new SettingsStore(dir);
    store.load();

    await Promise.all([
      store.update({ locale: "en" }),
      store.update({ locale: "zh" }),
    ]);

    expect(store.get()).toEqual({ locale: "zh" });
    expect(readdirSync(dir)).toEqual(["settings.json"]);
    expect(
      JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")),
    ).toEqual({ version: 1, locale: "zh" });
  });

  it("keeps the previous choice when a save fails, then recovers", async () => {
    const store = new SettingsStore(dir);
    store.load();
    await store.update({ locale: "zh" });

    // A directory where the temp file should go makes open() fail.
    const blocker = join(dir, `settings.json.${process.pid}.tmp`);
    mkdirSync(blocker);

    await expect(store.update({ locale: "en" })).rejects.toThrow();
    expect(store.get()).toEqual({ locale: "zh" });

    rmSync(blocker, { recursive: true });
    await expect(store.update({ locale: "en" })).resolves.toEqual({
      locale: "en",
    });
  });
});
