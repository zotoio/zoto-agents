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
  // Keep runtime deps external — Ink pulls in CJS modules with dynamic
  // require() that cannot survive being bundled into a single ESM file.
  // `install-local.ts` runs `npm install --omit=dev` inside the install
  // directory so the binary finds `ink` / `react` at runtime.
  noExternal: [],
});
