import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.vite/**",
      "**/out/**",
      "**/dist/**",
      "**/coverage/**",
      // Xcode-generated files and the synced copy of native/macos/safari/extension.
      "native/macos/safari/project/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: { "@typescript-eslint/no-unused-vars": "error" },
  },
  {
    // Plain Node scripts invoked directly by Chrome/the shell (not bundled
    // by vite), so they don't get the "node" types-driven globals the rest
    // of the TS project picks up implicitly.
    files: ["native/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  {
    // Safari extension background script: WebExtension globals, no bundler.
    files: ["native/macos/safari/extension/**/*.js"],
    languageOptions: {
      globals: { browser: "readonly", crypto: "readonly", console: "readonly" },
    },
  },
);
