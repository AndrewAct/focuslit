import { mkdirSync, readFileSync, renameSync } from "node:fs";
import { open, rename } from "node:fs/promises";
import { join } from "node:path";
import {
  SETTINGS_FILE_VERSION,
  settingsFileSchema,
  type SettingsUpdate,
  type SettingsView,
} from "@focuslit/contracts";

export type SettingsLoadOutcome =
  | "first-run"
  | "loaded"
  | "quarantined"
  | "unsupported-version"
  | "recovery-failed";

// Owns `settings.json` in the app's userData directory. Main process only:
// the renderer sees a validated SettingsView over IPC and never touches disk.
//
// Failure semantics:
// - Missing file is the first-run state (locale null → the UI asks).
// - An unreadable, unparsable or schema-invalid file is moved aside to
//   `settings.corrupt-<ms>.json` and treated as first run. Asking again is
//   cheap; guessing a language or crashing on boot is not. The original bytes
//   are kept for diagnosis instead of being overwritten by the next save.
// - Unknown versions and failed quarantine block saves, preserving the only
//   original copy for a compatible app or manual recovery.
// - Saves write a temp file, fsync it, then rename over the old file, so a
//   crash mid-save leaves either the old or the new settings, never a torn
//   file. Saves are serialized, and the in-memory view only changes after
//   the rename succeeds, so a failed save never shows a choice that would be
//   lost on restart.
export class SettingsStore {
  private readonly path: string;
  private current: SettingsView = { locale: null };
  private writeChain: Promise<unknown> = Promise.resolve();
  private writesBlocked = false;

  constructor(
    private readonly dir: string,
    private readonly nowMs: () => number = Date.now,
  ) {
    this.path = join(dir, "settings.json");
  }

  load(): SettingsLoadOutcome {
    this.writesBlocked = false;
    let raw: string;
    try {
      raw = readFileSync(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.current = { locale: null };
        return "first-run";
      }
      return this.quarantine();
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return this.quarantine();
    }
    if (
      typeof json === "object" &&
      json !== null &&
      "version" in json &&
      typeof json.version === "number" &&
      json.version !== SETTINGS_FILE_VERSION
    ) {
      this.current = { locale: null };
      this.writesBlocked = true;
      return "unsupported-version";
    }
    const parsed = settingsFileSchema.safeParse(json);
    if (!parsed.success) return this.quarantine();
    this.current = { locale: parsed.data.locale };
    return "loaded";
  }

  get(): SettingsView {
    return { ...this.current };
  }

  update(patch: SettingsUpdate): Promise<SettingsView> {
    const run = this.writeChain.then(async () => {
      if (this.writesBlocked) {
        throw new Error(
          "Settings require recovery or a compatible app version",
        );
      }
      const next = { version: SETTINGS_FILE_VERSION, ...patch };
      await this.writeAtomically(`${JSON.stringify(next, null, 2)}\n`);
      this.current = { locale: next.locale };
      return this.get();
    });
    // A failed save must not wedge every later save behind a rejected chain.
    this.writeChain = run.catch(() => undefined);
    return run;
  }

  private async writeAtomically(contents: string): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.path}.${process.pid}.tmp`;
    const handle = await open(tmp, "w", 0o600);
    try {
      await handle.writeFile(contents, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmp, this.path);
  }

  private quarantine(): SettingsLoadOutcome {
    try {
      renameSync(
        this.path,
        join(this.dir, `settings.corrupt-${this.nowMs()}.json`),
      );
    } catch {
      this.current = { locale: null };
      this.writesBlocked = true;
      return "recovery-failed";
    }
    this.current = { locale: null };
    return "quarantined";
  }
}
