import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node18",
  platform: "node",
  splitting: false,
  clean: true,
  sourcemap: false,
  dts: false,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
  noExternal: [],
});
