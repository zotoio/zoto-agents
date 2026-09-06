import { describe, expect, it } from "vitest";
import { classifyProcess } from "../src/discovery/collector.js";
import { inferKindFromWorkspaceSlug } from "../src/discovery/sessions.js";
import type { RawProcess } from "../src/discovery/processes.js";

function proc(command: string): RawProcess {
  return { pid: 1, ppid: 0, etimeSec: 1, command };
}

const MAC_MAIN = "/Applications/Cursor.app/Contents/MacOS/Cursor";
const MAC_RENDERER =
  "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper";
const MAC_GPU =
  "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper (GPU).app/Contents/MacOS/Cursor Helper (GPU)";

describe("classifyProcess", () => {
  it("labels the main IDE process on each platform", () => {
    expect(classifyProcess(proc(MAC_MAIN))).toEqual({ kind: "ide", label: "Cursor IDE" });
    expect(classifyProcess(proc("/usr/share/cursor/cursor"))).toEqual({
      kind: "ide",
      label: "Cursor IDE",
    });
    expect(classifyProcess(proc("C:\\Program Files\\cursor\\Cursor.exe"))).toEqual({
      kind: "ide",
      label: "Cursor IDE",
    });
  });

  it("classifies macOS helpers whose binary path contains spaces", () => {
    expect(classifyProcess(proc(`${MAC_RENDERER} --type=renderer --lang=en`))).toEqual({
      kind: "ide",
      label: "Cursor renderer",
    });
    expect(classifyProcess(proc(`${MAC_GPU} --type=gpu-process`))).toEqual({
      kind: "ide",
      label: "Cursor GPU helper",
    });
    // Older builds without --type still resolve via the helper name.
    expect(classifyProcess(proc(MAC_RENDERER))).toEqual({
      kind: "ide",
      label: "Cursor renderer",
    });
    expect(classifyProcess(proc(MAC_GPU))).toEqual({ kind: "ide", label: "Cursor GPU helper" });
  });

  it("does not mistake Linux Electron children for the main IDE process", () => {
    const base = "/usr/share/cursor/cursor";
    expect(classifyProcess(proc(`${base} --type=renderer --crashpad-handler-pid=1`)).label).toBe(
      "Cursor renderer",
    );
    expect(classifyProcess(proc(`${base} --type=gpu-process --ozone-platform=x11`)).label).toBe(
      "Cursor GPU helper",
    );
    expect(classifyProcess(proc(`${base} --type=zygote --no-zygote-sandbox`)).label).toBe(
      "Cursor zygote",
    );
    expect(classifyProcess(proc(`${base} --type=broker`)).label).toBe("Cursor broker");
    expect(
      classifyProcess(
        proc(`${base} --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-US`),
      ).label,
    ).toBe("Cursor node service");
    expect(
      classifyProcess(
        proc(`${base} --type=utility --utility-sub-type=network.mojom.NetworkService`),
      ).label,
    ).toBe("Cursor network service");
    expect(
      classifyProcess(proc(`${base} --type=utility --utility-sub-type=audio.mojom.AudioService`))
        .label,
    ).toBe("Cursor audio service");
    expect(classifyProcess(proc(`${base} --type=utility --inspect-port=0`)).label).toBe(
      "Cursor extension host",
    );
    expect(classifyProcess(proc(`${base} --type=utility`)).label).toBe("Cursor utility");
    expect(classifyProcess(proc(`${base} --type=ppapi`)).label).toBe("Cursor ppapi");
  });

  it("classifies /proc/self/exe workers by --type and falls back to helper", () => {
    expect(
      classifyProcess(
        proc("/proc/self/exe --type=utility --utility-sub-type=node.mojom.NodeService"),
      ),
    ).toEqual({ kind: "ide", label: "Cursor node service" });
    expect(classifyProcess(proc("/proc/self/exe --user-data-dir=/home/u/.config/Cursor"))).toEqual(
      { kind: "ide", label: "Cursor helper" },
    );
  });

  it("classifies CLI, cloud, terminal, sandbox and extension workers", () => {
    expect(classifyProcess(proc("/usr/local/bin/cursor-agent --resume foo")).kind).toBe("cli");
    expect(classifyProcess(proc("/exec-daemon/node /exec-daemon/index.js serve"))).toEqual({
      kind: "cloud",
      label: "Cloud Agent VM",
    });
    expect(
      classifyProcess(
        proc(
          "/usr/bin/bash --init-file /usr/share/cursor/resources/app/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh",
        ),
      ).label,
    ).toBe("Cursor terminal");
    expect(classifyProcess(proc("/usr/share/cursor/chrome-sandbox")).label).toBe("Cursor sandbox");
    expect(classifyProcess(proc("/usr/share/cursor/chrome_crashpad_handler --x")).label).toBe(
      "Cursor crashpad",
    );
    expect(
      classifyProcess(proc("/usr/share/cursor/cursor /home/u/.cursor/extensions/foo/dist/worker.js"))
        .label,
    ).toBe("Cursor extension worker");
  });

  it("returns unknown for non-Cursor binaries even when args mention Cursor", () => {
    const r = classifyProcess(proc("/usr/bin/node /opt/unrelated/server.js --user-data-dir=/tmp/Cursor"));
    expect(r.kind).toBe("unknown");
    expect(r.label).toBe("node");
  });
});

describe("inferKindFromWorkspaceSlug", () => {
  it("treats tmp-* workspaces as headless SDK agents, not cloud agents", () => {
    expect(inferKindFromWorkspaceSlug("tmp-087400d2-e87e-48bd-8e3d-f06349e0a671")).toBe("sdk");
    expect(inferKindFromWorkspaceSlug("TMP-dual-bs-run")).toBe("sdk");
  });
  it("treats path-derived and numeric slugs as IDE agents", () => {
    expect(inferKindFromWorkspaceSlug("home-andrewv-git-cursor-zoto-agents")).toBe("agent");
    expect(inferKindFromWorkspaceSlug("1788690724636")).toBe("agent");
    expect(inferKindFromWorkspaceSlug(null)).toBe("agent");
  });
});
