import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  pathTriggersPluginBuild,
  pluginHasBuildScript,
} from "../scripts/ensure-build.mjs";

const PLUGIN_ROOT = join(import.meta.dirname, "..");

describe("ensure-build.mjs", () => {
  it("pluginHasBuildScript is true for zoto-cursor-top", () => {
    expect(pluginHasBuildScript(PLUGIN_ROOT)).toBe(true);
  });

  it("pathTriggersPluginBuild matches src and bundler config", () => {
    expect(
      pathTriggersPluginBuild(join(PLUGIN_ROOT, "src", "cli.ts"), PLUGIN_ROOT),
    ).toBe(true);
    expect(
      pathTriggersPluginBuild(join(PLUGIN_ROOT, "tsup.config.ts"), PLUGIN_ROOT),
    ).toBe(true);
    expect(
      pathTriggersPluginBuild(join(PLUGIN_ROOT, "README.md"), PLUGIN_ROOT),
    ).toBe(false);
  });
});
