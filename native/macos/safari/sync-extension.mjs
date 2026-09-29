#!/usr/bin/env node
// Copies the canonical Safari extension sources (./extension) into the Xcode
// project's extension Resources folder so the two never drift. Run after
// editing anything under ./extension; a vitest check fails if they differ.
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
cpSync(
  `${here}extension`,
  `${here}project/FocusLitSafari/FocusLitSafari Extension/Resources`,
  { recursive: true },
);
console.log("Synced Safari extension sources into the Xcode project.");
