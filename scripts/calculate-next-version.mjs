#!/usr/bin/env node
/**
 * Calculates the next semantic version based on conventional commits since the last tag.
 *
 * Rules:
 * - feat: → minor bump
 * - fix: → patch bump
 * - BREAKING CHANGE or feat!: → major bump
 * - If no tags exist, starts at 0.1.0
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";

const getLastTag = () => {
  try {
    const tags = execSync("git tag --sort=-version:refname", {
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    return tags[0] || null;
  } catch {
    return null;
  }
};

const getCurrentVersion = () => {
  try {
    const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
    return packageJson.version || "0.1.0";
  } catch {
    return "0.1.0";
  }
};

const getCommitsSinceTag = (tag) => {
  try {
    // When no tag exists, get all commits (not just HEAD)
    // Use %H%n%B format to get hash + full body, separated by newline
    const command = tag
      ? `git log ${tag}..HEAD --pretty=format:"%H%n%B%n---COMMIT-SEPARATOR---"`
      : `git log --pretty=format:"%H%n%B%n---COMMIT-SEPARATOR---"`;
    const output = execSync(command, {
      encoding: "utf-8",
    }).trim();

    // Split by our separator and filter out empty entries
    const commits = output
      .split("---COMMIT-SEPARATOR---")
      .map((commit) => commit.trim())
      .filter(Boolean);

    return commits;
  } catch {
    return [];
  }
};

const parseVersion = (version) => {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
};

const formatVersion = ({ major, minor, patch }) => {
  return `${major}.${minor}.${patch}`;
};

const analyzeCommits = (commits) => {
  let hasBreaking = false;
  let hasFeature = false;
  let hasFix = false;

  for (const commit of commits) {
    const lowerCommit = commit.toLowerCase();

    // Extract subject line (first line) for header checks
    // Remove PR number suffix like "(#16)" that GitHub adds to merge commits
    const subject = commit
      .split("\n")[0]
      .toLowerCase()
      .replace(/\s*\(#\d+\)\s*$/, "");

    // Check for breaking changes
    // 1. BREAKING CHANGE in body/footer
    if (lowerCommit.includes("breaking change:")) {
      hasBreaking = true;
      break; // Major bump takes precedence
    }

    // 2. Breaking change indicator in header (feat!: or feat(scope)!:)
    if (/^([a-z]+)(\([^)]*\))?!:/.test(subject)) {
      hasBreaking = true;
      break; // Major bump takes precedence
    }

    // Check for features (with optional scope)
    // Match feat: or feat(scope): at the start of the subject
    if (/^feat(\([^)]*\))?:/.test(subject)) {
      hasFeature = true;
      // Don't break here - continue checking for breaking changes
    }

    // Check for fixes (with optional scope)
    if (/^fix(\([^)]*\))?:/.test(subject)) {
      hasFix = true;
      // Don't break here - continue checking for breaking/feat
    }
  }

  return { hasBreaking, hasFeature, hasFix };
};

const calculateNextVersion = () => {
  const lastTag = getLastTag();
  const currentVersion = getCurrentVersion();
  const baseVersion = lastTag ? lastTag.replace(/^v/, "") : currentVersion;

  const { major, minor, patch } = parseVersion(baseVersion);
  const commits = getCommitsSinceTag(lastTag);

  // If no new commits since last tag, return null to indicate no version bump needed
  if (commits.length === 0 && lastTag) {
    return null;
  }

  // Filter out version bump commits and merge commits
  // Extract subject line for filtering
  const relevantCommits = commits.filter((commit) => {
    const subject = commit.split("\n")[0].toLowerCase();
    return (
      !subject.startsWith("chore: bump version") &&
      !subject.startsWith("chore(release):") &&
      !subject.startsWith("merge")
    );
  });

  // If only version bump commits, no new version needed
  if (relevantCommits.length === 0 && lastTag) {
    return null;
  }

  const { hasBreaking, hasFeature, hasFix } = analyzeCommits(relevantCommits);

  if (hasBreaking) {
    return formatVersion({ major: major + 1, minor: 0, patch: 0 });
  } else if (hasFeature) {
    return formatVersion({ major, minor: minor + 1, patch: 0 });
  } else if (hasFix) {
    return formatVersion({ major, minor, patch: patch + 1 });
  }

  // If no conventional commits but there are commits, default to patch bump
  if (relevantCommits.length > 0) {
    return formatVersion({ major, minor, patch: patch + 1 });
  }

  return null;
};

const main = () => {
  try {
    const nextVersion = calculateNextVersion();
    if (nextVersion === null) {
      // Exit with code 1 to indicate no version bump needed
      process.exit(1);
    }
    console.log(nextVersion);
    process.exit(0);
  } catch (error) {
    console.error("Error calculating next version:", error.message);
    // Exit with code 2 to indicate actual error (distinct from no-bump)
    process.exit(2);
  }
};

main();
