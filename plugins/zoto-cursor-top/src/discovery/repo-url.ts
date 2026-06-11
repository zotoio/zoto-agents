/**
 * Resolve Cursor workspace slugs and local paths to a compact GitHub slug
 * suitable for the REPO column (`owner/repo`).
 *
 * Cursor encodes absolute workspace paths as slugs by stripping the leading
 * slash and replacing path separators with hyphens, e.g.
 * /home/dev/git/acme/widget becomes home-dev-git-acme-widget. Hyphens inside
 * directory names are preserved, so slug → path decoding is lossy; we build
 * a slug → path map from IDE process commands and workspaceStorage instead.
 */

import { join } from "node:path";
import type { FsLike } from "../types.js";

/** Encode an absolute filesystem path the way Cursor names project folders. */
export function slugFromAbsolutePath(absPath: string): string {
  return absPath.replace(/^\//, "").replace(/\//g, "-");
}

/**
 * Pull absolute directory paths out of a process command line. Used to
 * correlate IDE windows with workspace slugs.
 */
export function extractAbsolutePaths(command: string): string[] {
  const out: string[] = [];
  for (const m of command.matchAll(/(?:\/[\w.@+-]+)+/g)) {
    const candidate = m[0]!;
    if (candidate.length > 1) out.push(candidate);
  }
  return out;
}

/** Parse the origin remote url from a .git/config file body. */
export function parseGitConfigOrigin(content: string): string | null {
  const lines = content.split(/\r?\n/);
  let inOrigin = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\[remote "origin"\]$/i.test(line)) {
      inOrigin = true;
      continue;
    }
    if (inOrigin && /^\[/.test(line)) break;
    if (inOrigin) {
      const m = line.match(/^url\s*=\s*(.+)$/i);
      if (m?.[1]) return m[1].trim();
    }
  }
  return null;
}

/**
 * Normalise a git remote URL to owner/repo for display.
 * Returns null when the remote is not a GitHub URL.
 */
export function normalizeGitHubDisplayUrl(remote: string): string | null {
  const trimmed = remote.trim().replace(/\/$/, "");
  // git@github.com:owner/repo.git
  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) return `${ssh[1]}/${ssh[2]!.replace(/\.git$/, "")}`;
  // https://github.com/owner/repo.git
  const https = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?(?:\/.*)?$/i,
  );
  if (https) return `${https[1]}/${https[2]!.replace(/\.git$/, "")}`;
  // ssh://git@github.com/owner/repo.git
  const sshProto = trimmed.match(
    /^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i,
  );
  if (sshProto) {
    return `${sshProto[1]}/${sshProto[2]!.replace(/\.git$/, "")}`;
  }
  return null;
}

/** Remove a legacy `github.com/` prefix from stored display values. */
export function stripGitHubHost(display: string): string {
  return display.replace(/^github\.com\//i, "");
}

/** Plain-text value for the REPO column (`owner/repo`, slug, or path). */
export function formatRepoDisplay(repo: string | null | undefined): string {
  if (!repo) return "-";
  return stripGitHubHost(repo);
}

/** Read .git/config under repoPath and return a GitHub display URL. */
export async function resolveGitHubRepoUrl(
  fs: FsLike,
  repoPath: string,
): Promise<string | null> {
  const configPath = join(repoPath, ".git", "config");
  if (!(await fs.exists(configPath))) return null;
  try {
    const content = await fs.readFile(configPath, "utf8");
    const origin = parseGitConfigOrigin(content);
    if (!origin) return null;
    return normalizeGitHubDisplayUrl(origin);
  } catch {
    return null;
  }
}

/**
 * Build slug → absolute workspace path from IDE process commands and
 * workspaceStorage workspace.json folder URIs.
 */
export async function buildSlugPathMap(
  fs: FsLike,
  dataRoot: string | undefined,
  pidCommands: Map<number, string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const register = (absPath: string): void => {
    if (!absPath.startsWith("/")) return;
    map.set(slugFromAbsolutePath(absPath), absPath);
  };

  for (const cmd of pidCommands.values()) {
    for (const p of extractAbsolutePaths(cmd)) register(p);
  }

  if (dataRoot) {
    const storageRoot = join(dataRoot, "User", "workspaceStorage");
    if (await fs.exists(storageRoot)) {
      let entries: string[];
      try {
        entries = await fs.readdir(storageRoot);
      } catch {
        entries = [];
      }
      for (const hash of entries) {
        const wsFile = join(storageRoot, hash, "workspace.json");
        if (!(await fs.exists(wsFile))) continue;
        try {
          const raw = await fs.readFile(wsFile, "utf8");
          const parsed = JSON.parse(raw) as { folder?: string };
          const folder = parsed.folder;
          if (!folder || typeof folder !== "string") continue;
          const path = decodeWorkspaceFolderUri(folder);
          if (path) register(path);
        } catch {
          /* skip malformed workspace.json */
        }
      }
    }
  }

  return map;
}

/** Decode file-URL workspace folder URIs from workspaceStorage. */
export function decodeWorkspaceFolderUri(uri: string): string | null {
  if (!uri.startsWith("file://")) return null;
  try {
    return decodeURIComponent(uri.slice("file://".length));
  } catch {
    return null;
  }
}

/**
 * Resolve a node's repo field (slug or absolute path) to a GitHub
 * display URL when possible. Mutates nothing; returns the URL or null.
 */
export async function resolveRepoDisplayUrl(
  fs: FsLike,
  repo: string | null,
  slugPaths: Map<string, string>,
): Promise<string | null> {
  if (!repo) return null;
  if (/github\.com/i.test(repo)) return stripGitHubHost(repo);

  let workspacePath: string | null = null;
  if (repo.startsWith("/")) {
    workspacePath = repo;
  } else if (slugPaths.has(repo)) {
    workspacePath = slugPaths.get(repo)!;
  }

  if (!workspacePath) return null;
  if (!(await fs.exists(workspacePath))) return null;
  return resolveGitHubRepoUrl(fs, workspacePath);
}
