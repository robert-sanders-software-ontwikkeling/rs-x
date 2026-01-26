#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const workspaceFile = 'pnpm-workspace.yaml';
const workspace = yaml.load(fs.readFileSync(workspaceFile, 'utf8'));

let node_libs = [];
let angular_libs = [];

for (const pkg of workspace.packages) {
    const pkgPath = path.resolve(pkg, 'package.json');
    const ngPkgPath = path.resolve(pkg, 'ng-package.json');

    if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, 'utf8');
        if (content.includes('"@angular/') || fs.existsSync(ngPkgPath)) {
            angular_libs.push(pkg);
        } else {
            node_libs.push(pkg);
        }
    }
}

fs.appendFileSync(process.env.GITHUB_ENV, `node_libs=${node_libs.join(' ')}\n`);
fs.appendFileSync(process.env.GITHUB_ENV, `angular_libs=${angular_libs.join(' ')}\n`);