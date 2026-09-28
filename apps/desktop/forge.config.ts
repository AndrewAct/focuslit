const config = {
  packagerConfig: {
    name: "FocusLit",
    executableName: "focuslit",
    asar: true,
  },
  makers: [{ name: "@electron-forge/maker-zip", platforms: ["darwin"] }],
  plugins: [
    {
      name: "@electron-forge/plugin-vite",
      config: {
        build: [
          { entry: "src/main.ts", config: "vite.main.config.ts" },
          { entry: "src/preload.ts", config: "vite.preload.config.ts" },
        ],
        renderer: [{ name: "main_window", config: "vite.renderer.config.ts" }],
      },
    },
  ],
};

export default config;
