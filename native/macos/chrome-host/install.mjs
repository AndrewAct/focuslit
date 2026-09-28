#!/usr/bin/env node
// Registers the FocusLit Chrome native-messaging host for this checkout.
// Run once (and again if this repo moves) with: node install.mjs
//
// What this does NOT do: install/load the Chrome extension itself (that's
// still a manual chrome://extensions step — see the printed instructions),
// or touch Safari (no Safari bridge exists yet).
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// host.mjs's own "#!/usr/bin/env node" shebang only resolves in an
// interactive shell, where PATH includes Homebrew/nvm/etc. Chrome spawns
// the native-messaging host with macOS's minimal default PATH (no
// Homebrew), so `env` can't find `node` there and the process exits
// instantly with no output — surfaces in the extension's service worker
// console as "Native host has exited." with nothing else logged. Fixing
// this needs the exact node binary path baked in, which is why the
// manifest below points at a generated wrapper instead of host.mjs
// directly.
const nodeBinaryPath = process.execPath;

// Fixed by apps/extension/manifest.json's pinned "key" field, which pins
// this repo's unpacked-extension id regardless of which folder it's cloned
// into. Regenerate both together (see that file's comment) if this ever
// needs to change.
const EXTENSION_ID = "fcfekebhkfdaifnkckadnhndhplfcfnm";
const HOST_NAME = "com.focuslit.chromehost";

const hereDir = fileURLToPath(new URL(".", import.meta.url));
const hostScriptPath = join(hereDir, "host.mjs");
// hereDir is native/macos/chrome-host/ — three levels up is the repo root.
const repoRoot = join(hereDir, "..", "..", "..");
const extensionDistDir = join(repoRoot, "apps", "extension", "dist");
const testPagePath = join(
  repoRoot,
  "apps",
  "extension",
  "focuslit-test-page",
  "index.html",
);

const wrapperPath = join(hereDir, "run-host.sh");
const wrapperScript = `#!/bin/sh\nexec "${nodeBinaryPath}" "${hostScriptPath}" "$@"\n`;

const manifest = {
  name: HOST_NAME,
  description: "FocusLit Chrome bridge (M1 dev, read-only)",
  path: wrapperPath,
  type: "stdio",
  allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
};

// Stable-channel Chrome on macOS only. Chrome Beta/Canary/Dev and other
// OSes use different NativeMessagingHosts directories — out of scope here.
const targetDir = join(
  homedir(),
  "Library/Application Support/Google/Chrome/NativeMessagingHosts",
);
const targetPath = join(targetDir, `${HOST_NAME}.json`);

chmodSync(hostScriptPath, 0o755);
writeFileSync(wrapperPath, wrapperScript);
chmodSync(wrapperPath, 0o755);
mkdirSync(targetDir, { recursive: true });
writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote node-path wrapper to:\n  ${wrapperPath}`);
console.log(`  (hardcodes node at: ${nodeBinaryPath})`);
console.log(`Wrote native messaging host manifest to:\n  ${targetPath}`);
console.log(`Pointing at wrapper, which execs:\n  ${hostScriptPath}\n`);
console.log("Next steps (manual, real Chrome required):");
console.log("  1. chrome://extensions -> enable Developer mode.");
console.log(`  2. "Load unpacked" -> select: ${extensionDistDir}`);
console.log('     (run "pnpm build:extension" first if dist/ is missing)');
console.log(
  '  3. On the loaded extension\'s card, enable "Allow access to file URLs".',
);
console.log(`  4. Open: file://${testPagePath}`);
console.log(
  '  5. With the FocusLit desktop app running, its footer should flip Chrome to "connected".',
);
