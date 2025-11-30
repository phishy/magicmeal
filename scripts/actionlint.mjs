#!/usr/bin/env node

import { createLinter } from "actionlint";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const WORKFLOW_EXTENSIONS = new Set([".yml", ".yaml"]);

const targets = process.argv.slice(2);
const searchRoots = targets.length > 0 ? targets : [".github/workflows"];

/**
 * Recursively collect workflow files under provided roots.
 * @param {string[]} roots
 * @returns {Promise<string[]>}
 */
async function collectWorkflowFiles(roots) {
  const files = [];

  for (const root of roots) {
    const absolute = path.resolve(process.cwd(), root);
    try {
      const info = await stat(absolute);
      if (info.isDirectory()) {
        files.push(...(await walkDirectory(absolute)));
      } else if (info.isFile() && isWorkflowFile(absolute)) {
        files.push(absolute);
      }
    } catch (error) {
      console.warn(`Skipping ${root}: ${error.message}`);
    }
  }

  return files;
}

async function walkDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(entryPath)));
    } else if (entry.isFile() && isWorkflowFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function isWorkflowFile(filePath) {
  return WORKFLOW_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Run actionlint against the selected files.
 */
async function main() {
  const files = await collectWorkflowFiles(searchRoots);
  if (files.length === 0) {
    console.log("actionlint: no workflow files to lint");
    return;
  }

  const linter = await createLinter();
  let hasErrors = false;

  for (const file of files) {
    const contents = await readFile(file, "utf8");
    const results = linter(contents, path.relative(process.cwd(), file));

    for (const issue of results) {
      hasErrors = true;
      console.error(
        `${issue.file}:${issue.line}:${issue.column} ${issue.message} (${issue.kind})`
      );
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  } else {
    console.log(`actionlint: checked ${files.length} file(s)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

