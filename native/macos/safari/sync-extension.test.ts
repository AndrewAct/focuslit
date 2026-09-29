import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const here = import.meta.dirname;
const source = join(here, "extension");
const copy = join(
  here,
  "project/FocusLitSafari/FocusLitSafari Extension/Resources",
);

function files(dir: string, prefix = ""): string[] {
  return readdirSync(dir).flatMap((name) => {
    const rel = join(prefix, name);
    return statSync(join(dir, name)).isDirectory()
      ? files(join(dir, name), rel)
      : [rel];
  });
}

describe("Safari extension sources", () => {
  it("match the copy embedded in the Xcode project", () => {
    // Fix with: node native/macos/safari/sync-extension.mjs
    expect(files(copy).sort()).toEqual(files(source).sort());
    for (const rel of files(source)) {
      expect(readFileSync(join(copy, rel), "utf8"), rel).toBe(
        readFileSync(join(source, rel), "utf8"),
      );
    }
  });

  it("asks only for a user-invoked active tab, never background tab access", () => {
    const manifest = JSON.parse(
      readFileSync(join(source, "manifest.json"), "utf8"),
    );
    const background = readFileSync(join(source, "background.js"), "utf8");

    expect(manifest.permissions).toEqual(["activeTab", "nativeMessaging"]);
    expect(manifest.action).toEqual({
      default_title: "Send FocusLit fixture message",
    });
    expect(background).toContain("browser.action.onClicked.addListener");
    expect(background).not.toContain("browser.tabs.");
    expect(background).not.toContain('setBadgeText({ text: "OK" })');
    expect(background).not.toContain('setBadgeText({ text: "!" })');
  });
});
