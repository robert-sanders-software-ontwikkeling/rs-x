#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "fs";
import path from "path";

const DIST_TAG = process.env.DIST_TAG || "latest";

// Folders of Node packages
const nodePackageFolders = [
  "rs-x-core",
  "rs-x/state-manager",
  "rs-x/expression-parser"
];

// Angular dist folder
const angularDist = "rs-x-angular/dist/rsx";

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...options });
}

// ---------------- PATCH ANGULAR PACKAGE ----------------
function patchAngularPackage() {
  const angularPkgPath = path.join(angularDist, "package.json");

  if (!fs.existsSync(angularPkgPath)) {
    console.error("Angular dist folder not found:", angularPkgPath);
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(angularPkgPath, "utf-8"));

  // Get actual published versions of Node packages
  const coreVersion = execSync(`pnpm info rs-x-core version --json`).toString().trim().replace(/"/g, "");
  const stateVersion = execSync(`pnpm info rs-x/state-manager version --json`).toString().trim().replace(/"/g, "");
  const expVersion = execSync(`pnpm info rs-x/expression-parser version --json`).toString().trim().replace(/"/g, "");

  pkgJson.dependencies["@rs-x/core"] = coreVersion;
  pkgJson.dependencies["@rs-x/state-manager"] = stateVersion;
  pkgJson.dependencies["@rs-x/expression-parser"] = expVersion;

  fs.writeFileSync(angularPkgPath, JSON.stringify(pkgJson, null, 2));
  console.log("Patched Angular package.json with actual published versions");
}

// ---------------- DRY-RUN ----------------
console.log("=== Pre-flight dry-run for Node packages ===");
for (const folder of nodePackageFolders) {
  run(`pnpm publish ${folder} --dry-run --tag ${DIST_TAG}`);
}

// Patch Angular first
console.log("=== Patching Angular package ===");
patchAngularPackage();

// Dry-run for Angular
console.log("=== Pre-flight dry-run for Angular package ===");
run(`pnpm publish ${angularDist} --dry-run --tag ${DIST_TAG}`);

// ---------------- PUBLISH ----------------
console.log("=== Publishing Node packages ===");
for (const folder of nodePackageFolders) {
  run(`pnpm publish ${folder} --tag ${DIST_TAG} --access public --provenance --no-git-checks`);
}

console.log("=== Publishing Angular package ===");
run(`pnpm publish ${angularDist} --tag ${DIST_TAG} --access public --provenance --no-git-checks`);

console.log("=== All packages published successfully! ===");