import { describe, expect, it } from "vitest";
import {
  buildSlugPathMap,
  decodeWorkspaceFolderUri,
  extractAbsolutePaths,
  formatRepoDisplay,
  normalizeGitHubDisplayUrl,
  parseGitConfigOrigin,
  resolveGitHubRepoUrl,
  slugFromAbsolutePath,
} from "../src/discovery/repo-url.js";
import type { FsLike } from "../src/types.js";

describe("slugFromAbsolutePath", () => {
  it("encodes absolute paths the way Cursor names project folders", () => {
    expect(slugFromAbsolutePath("/home/andrewv/git/cursor/zoto-agents")).toBe(
      "home-andrewv-git-cursor-zoto-agents",
    );
  });
});

describe("extractAbsolutePaths", () => {
  it("pulls directory paths out of process commands", () => {
    const paths = extractAbsolutePaths(
      "/Applications/Cursor.app/Contents/MacOS/Cursor /home/andrewv/git/cursor/zoto-agents",
    );
    expect(paths.some((p) => p.endsWith("zoto-agents"))).toBe(true);
  });
});

describe("parseGitConfigOrigin", () => {
  it("reads the origin url from a git config body", () => {
    const config = [
      '[remote "origin"]',
      "	url = git@github.com:zotoio/zoto-agents.git",
      '[branch "main"]',
    ].join("\n");
    expect(parseGitConfigOrigin(config)).toBe(
      "git@github.com:zotoio/zoto-agents.git",
    );
  });
});

describe("normalizeGitHubDisplayUrl", () => {
  it("normalises SSH remotes", () => {
    expect(normalizeGitHubDisplayUrl("git@github.com:zotoio/zoto-agents.git")).toBe(
      "zotoio/zoto-agents",
    );
  });

  it("normalises HTTPS remotes", () => {
    expect(
      normalizeGitHubDisplayUrl("https://github.com/zotoio/zoto-agents.git"),
    ).toBe("zotoio/zoto-agents");
  });

  it("returns null for non-GitHub hosts", () => {
    expect(normalizeGitHubDisplayUrl("git@gitlab.com:acme/widget.git")).toBeNull();
  });

  it("strips legacy github.com prefixes for display", () => {
    expect(formatRepoDisplay("github.com/zotoio/zoto-agents")).toBe("zotoio/zoto-agents");
    expect(formatRepoDisplay("zotoio/zoto-agents")).toBe("zotoio/zoto-agents");
    expect(formatRepoDisplay(null)).toBe("-");
  });
});

describe("decodeWorkspaceFolderUri", () => {
  it("decodes file:// workspace folder URIs", () => {
    expect(
      decodeWorkspaceFolderUri("file:///home/andrewv/git/cursor/zoto-agents"),
    ).toBe("/home/andrewv/git/cursor/zoto-agents");
  });
});

describe("resolveGitHubRepoUrl", () => {
  it("reads origin from .git/config via the injected fs facade", async () => {
    const fs: FsLike = {
      readdir: async () => [],
      readFile: async (path) => {
        if (path.endsWith(".git/config")) {
          return [
            '[remote "origin"]',
            "	url = git@github.com:zotoio/zoto-agents.git",
          ].join("\n");
        }
        throw new Error(`unexpected read: ${path}`);
      },
      readWindow: async () => Buffer.alloc(0),
      stat: async () => ({
        isDirectory: () => false,
        isFile: () => true,
        mtimeMs: 0,
        size: 0,
      }),
      exists: async (path) => path.endsWith(".git/config"),
    };
    const url = await resolveGitHubRepoUrl(fs, "/home/andrewv/git/cursor/zoto-agents");
    expect(url).toBe("zotoio/zoto-agents");
  });
});

describe("buildSlugPathMap", () => {
  it("indexes workspace paths from process commands and workspaceStorage", async () => {
    const dataRoot = "/home/u/.config/Cursor";
    const fs: FsLike = {
      readdir: async (path) => {
        if (path === `${dataRoot}/User/workspaceStorage`) return ["abc123"];
        return [];
      },
      readFile: async (path) => {
        if (path.endsWith("workspace.json")) {
          return JSON.stringify({
            folder: "file:///home/andrewv/git/cursor/zoto-agents",
          });
        }
        throw new Error(`unexpected read: ${path}`);
      },
      readWindow: async () => Buffer.alloc(0),
      stat: async () => ({
        isDirectory: () => false,
        isFile: () => true,
        mtimeMs: 0,
        size: 0,
      }),
      exists: async (path) =>
        path === `${dataRoot}/User/workspaceStorage` ||
        path.endsWith("workspace.json"),
    };
    const commands = new Map<number, string>([
      [
        100,
        "/Applications/Cursor.app/Contents/MacOS/Cursor /home/andrewv/git/other/repo",
      ],
    ]);
    const map = await buildSlugPathMap(fs, dataRoot, commands);
    expect(map.get("home-andrewv-git-cursor-zoto-agents")).toBe(
      "/home/andrewv/git/cursor/zoto-agents",
    );
    expect(map.get("home-andrewv-git-other-repo")).toBe("/home/andrewv/git/other/repo");
  });
});
