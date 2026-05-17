#!/usr/bin/env node
/**
 * Wrapper that runs the compiled CLI from dist/.
 *
 * Kept tiny so `npm install -g` (or `yarn global add`) installs a binary
 * that points at the published build artifact without needing tsx.
 */

import "../dist/cli.js";
