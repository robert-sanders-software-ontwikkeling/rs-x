#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "fs";
import path from "path";

const DIST_TAG = process.env.DIST_TAG || "latest";

// Node package folders (relative to repo root)
const nodePackageFolders = ["rs-x-core", "rs-x-state-manager", "rs-x-expression-parser"];
const angularDist = "rs-x-angular/dist/rsx";

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...options });
}

// ---------------- PATCH ANGULAR PACKAGE ----------------
function patchAngularPackage() {
  const pkgJsonPath = path.join(angularDist, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    console.error("Angular dist folder not found:", angularDist);
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));

  // Use actual published Node package versions
  const coreVersion = execSync("pnpm info @rs-x/core version --json").toString().trim().replace(/"/g, "");
  const expVersion = execSync("pnpm info @rs-x/expression-parser version --json").toString().trim().replace(/"/g, "");

  pkgJson.dependencies["@rs-x/core"] = coreVersion;
  pkgJson.dependencies["@rs-x/expression-parser"] = expVersion;

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  console.log("Patched Angular package.json with actual published versions");
}

// ---------------- DRY-RUN PRE-CHECK ----------------
console.log("=== Pre-flight dry-run check ===");
for (const folder of [...nodePackageFolders, angularDist]) {
  run(`pnpm publish ${folder} --dry-run --tag ${DIST_TAG}`);
}
console.log("Dry-run succeeded → all packages ready for publishing");

// ---------------- REAL PUBLISH ----------------
console.log("=== Publishing Node packages ===");
for (const folder of nodePackageFolders) {
  run(`pnpm publish ${folder} --tag ${DIST_TAG} --access public --no-git-checks`);
}

console.log("=== Patching Angular package.json ===");
patchAngularPackage();

console.log("=== Publishing Angular package ===");
run(`pnpm publish ${angularDist} --tag ${DIST_TAG} --access public --no-git-checks`);

console.log("=== All packages published successfully! ===");