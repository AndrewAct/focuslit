import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: rootDir,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: `${rootDir}src/background.ts`,
      formats: ["es"],
      fileName: () => "background.js",
    },
  },
  plugins: [
    {
      name: "focuslit-copy-manifest",
      closeBundle() {
        copyFileSync(`${rootDir}manifest.json`, `${rootDir}dist/manifest.json`);
      },
    },
  ],
});
