import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["hooks/zoto-session-start.ts", "hooks/zoto-onstop-check.ts"],
  outDir: "hooks",
  format: ["esm"],
  outExtension: () => ({ js: ".mjs" }),
  clean: false,
  sourcemap: false,
  dts: false,
});
