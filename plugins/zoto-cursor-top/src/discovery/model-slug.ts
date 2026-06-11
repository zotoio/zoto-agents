/**
 * Helpers for recognising placeholder model picker values ("default", "auto")
 * that Cursor stores in composerData even when a concrete slug is in use.
 */

const PLACEHOLDER_MODELS = new Set(["default", "auto"]);

/** True when the slug is missing or a Cursor picker placeholder, not a real model id. */
export function isPlaceholderModelSlug(model: string | null | undefined): boolean {
  if (model == null) return true;
  const trimmed = model.trim();
  if (trimmed.length === 0) return true;
  return PLACEHOLDER_MODELS.has(trimmed.toLowerCase());
}

/** Prefer `resolved` when `current` is a placeholder; otherwise keep `current`. */
export function coalesceModelSlug(
  current: string | null | undefined,
  resolved: string | null | undefined,
): string | null {
  if (current && !isPlaceholderModelSlug(current)) return current;
  if (resolved && !isPlaceholderModelSlug(resolved)) return resolved;
  return current ?? resolved ?? null;
}
