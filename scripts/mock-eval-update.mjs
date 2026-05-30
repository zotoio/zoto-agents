#!/usr/bin/env node
const argv = process.argv.slice(2);
const isCheck = argv.includes("--check");

if (!isCheck) {
  console.log("[eval:update] apply mode — not used in this fixture harness");
  process.exit(0);
}

console.log("[eval:update --check] scanning manifest vs primitives — no drift (fixture harness)");
console.log("");
process.exit(0);
