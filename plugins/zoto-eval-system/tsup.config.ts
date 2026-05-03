import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["hooks/zoto-eval-session-start.ts"],
  outDir: "hooks",
  format: ["esm"],
  outExtension: () => ({ js: ".mjs" }),
  clean: false,
  sourcemap: false,
  dts: false,
});
