#!/usr/bin/env node
/**
 * Updates package.json and package-lock.json with a new version.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const updateVersion = (version) => {
  try {
    // Update package.json
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    packageJson.version = version;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    // Update package-lock.json using npm
    execSync('npm version --no-git-tag-version --allow-same-version ' + version, {
      stdio: 'inherit',
    });
    
    console.log(`Updated version to ${version}`);
  } catch (error) {
    console.error('Error updating version:', error.message);
    process.exit(1);
  }
};

const main = () => {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node update-package-version.mjs <version>');
    process.exit(1);
  }
  
  updateVersion(version);
};

main();
