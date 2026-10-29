import {
  closeSync,
  copyFileSync,
  constants,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  FOCUS_LOG_FILE_VERSION,
  focusLogFileSchema,
  legacyFocusLogFileSchema,
} from "@focuslit/contracts";
import { emptyLedger, type FocusLedger } from "@focuslit/core/focus-ledger";

export type FocusLogLoadOutcome =
  | "first-run"
  | "loaded"
  | "migrated"
  | "quarantined"
  | "unsupported-version"
  | "recovery-failed";

// Owns `focus-log.json` in the app's userData directory (main process only).
//
// Failure semantics mirror SettingsStore:
// - Missing file starts an empty ledger.
// - An unreadable or schema-invalid file is moved aside to
//   `focus-log.corrupt-<ms>.json` and the ledger starts empty, keeping the
//   original bytes for diagnosis instead of overwriting them.
// - Unknown versions and failed quarantine block saves, so a newer app's
//   history is never replaced by this version's.
// - Saves validate, write a temp file, fsync it, then rename. Writes are
//   synchronous so quit can flush; running checkpoints are minute-spaced,
//   phase changes flush immediately. Full-file rewrite cost grows with history.
export class FocusLogStore {
  private readonly path: string;
  private writesBlocked = false;

  constructor(
    private readonly dir: string,
    private readonly nowMs: () => number = Date.now,
  ) {
    this.path = join(dir, "focus-log.json");
  }

  load(): { outcome: FocusLogLoadOutcome; ledger: FocusLedger } {
    this.writesBlocked = false;
    let raw: string;
    try {
      raw = readFileSync(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { outcome: "first-run", ledger: emptyLedger };
      return { outcome: this.quarantine(), ledger: emptyLedger };
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { outcome: this.quarantine(), ledger: emptyLedger };
    }
    const legacy = legacyFocusLogFileSchema.safeParse(json);
    if (legacy.success) {
      try {
        // Never replace an earlier migration backup. If it exists, require
        // identical bytes before allowing this migration to write anything.
        const backup = join(this.dir, "focus-log.v1-backup.json");
        try {
          copyFileSync(this.path, backup, constants.COPYFILE_EXCL);
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code !== "EEXIST" ||
            readFileSync(backup, "utf8") !== raw
          )
            throw error;
        }
      } catch {
        this.writesBlocked = true;
        return { outcome: "recovery-failed", ledger: emptyLedger };
      }
      return {
        outcome: "migrated",
        ledger: { legacyDays: legacy.data.days, sessions: [] },
      };
    }
    if (
      typeof json === "object" &&
      json !== null &&
      "version" in json &&
      typeof json.version === "number" &&
      json.version !== FOCUS_LOG_FILE_VERSION &&
      json.version !== 1
    ) {
      this.writesBlocked = true;
      return { outcome: "unsupported-version", ledger: emptyLedger };
    }
    const parsed = focusLogFileSchema.safeParse(json);
    if (!parsed.success)
      return { outcome: this.quarantine(), ledger: emptyLedger };
    return {
      outcome: "loaded",
      ledger: {
        legacyDays: parsed.data.legacyDays,
        sessions: parsed.data.sessions,
      },
    };
  }

  /** Returns false when saving is blocked or the write failed. */
  save(ledger: FocusLedger): boolean {
    if (this.writesBlocked) return false;
    const parsed = focusLogFileSchema.safeParse({
      version: FOCUS_LOG_FILE_VERSION,
      ...ledger,
    });
    if (!parsed.success) return false;
    const contents = `${JSON.stringify(parsed.data, null, 2)}\n`;
    const tmp = `${this.path}.${process.pid}.tmp`;
    try {
      mkdirSync(this.dir, { recursive: true });
      const fd = openSync(tmp, "w", 0o600);
      try {
        writeFileSync(fd, contents, "utf8");
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      renameSync(tmp, this.path);
      return true;
    } catch {
      return false;
    }
  }

  private quarantine(): FocusLogLoadOutcome {
    try {
      renameSync(
        this.path,
        join(this.dir, `focus-log.corrupt-${this.nowMs()}.json`),
      );
    } catch {
      this.writesBlocked = true;
      return "recovery-failed";
    }
    return "quarantined";
  }
}
