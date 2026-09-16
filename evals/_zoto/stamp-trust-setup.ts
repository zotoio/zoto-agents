// _meta.generated: true
/**
 * Stamp-trust gate setup — runs before any eval suite case so truncated stamps
 * or `#eval-engine` alias drift cannot emit a silent-green run.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { assertStampTrust } from "./stamp-trust-gate.js";
import { evalEngineRoot } from "./plugin-root.js";

const evalsDir = dirname(dirname(fileURLToPath(import.meta.url)));

assertStampTrust({
  evalsDir,
  resolveEvalEngineRoot: () => evalEngineRoot,
});
