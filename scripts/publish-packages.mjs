#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "fs";
import path from "path";

const DIST_TAG = process.env.DIST_TAG || "latest";

// Node packages (workspace packages)
const nodePackages = ["@rs-x/core", "@rs-x/state-manager", "@rs-x/expression-parser"];
const angularDist = "rs-x-angular/dist/rsx";

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...options });
}

function pnpmInfoExists(pkg) {
  try {
    execSync(`pnpm info ${pkg}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function publishPackage(pkg) {
  if (pnpmInfoExists(pkg)) {
    console.log(`${pkg} exists → publishing with OIDC & provenance`);
    run(`pnpm publish ${pkg} --tag ${DIST_TAG} --access public --provenance --no-git-checks`);
  } else {
    console.log(`First-time publish of ${pkg} → publishing normally`);
    run(`pnpm publish ${pkg} --tag ${DIST_TAG} --access public --no-git-checks`);
  }
}

function patchAngularPackage() {
  const angularPkgPath = path.join(angularDist, "package.json");

  if (!fs.existsSync(angularPkgPath)) {
    console.error("Angular dist folder not found:", angularDist);
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(angularPkgPath, "utf-8"));

  // Get actual published versions of Node packages
  const coreVersion = execSync("pnpm info @rs-x/core version --json").toString().trim().replace(/"/g, "");
  const expVersion = execSync("pnpm info @rs-x/expression-parser version --json").toString().trim().replace(/"/g, "");

  pkgJson.dependencies["@rs-x/core"] = coreVersion;
  pkgJson.dependencies["@rs-x/expression-parser"] = expVersion;

  fs.writeFileSync(angularPkgPath, JSON.stringify(pkgJson, null, 2));
  console.log("Patched Angular dist package.json with actual published versions");
}

// ---------------- DRY-RUN PRE-CHECK ----------------
console.log("=== Pre-flight dry-run check for Node packages ===");
for (const pkg of nodePackages) {
  run(`pnpm publish ${pkg} --dry-run --tag ${DIST_TAG}`);
}

// ---------------- PATCH ANGULAR PACKAGE ----------------
console.log("=== Patching Angular package ===");
patchAngularPackage();

// ---------------- DRY-RUN ANGULAR PACKAGE ----------------
console.log("=== Pre-flight dry-run check for Angular package ===");
run(`pnpm publish ${angularDist} --dry-run --tag ${DIST_TAG}`);


// ---------------- PUBLISH NODE PACKAGES ----------------
console.log("=== Publishing Node packages ===");
for (const pkg of nodePackages) publishPackage(pkg);

// ---------------- PUBLISH ANGULAR PACKAGE ----------------
console.log("=== Publishing Angular package ===");
publishPackage(angularDist);

console.log("=== All packages published successfully! ===");