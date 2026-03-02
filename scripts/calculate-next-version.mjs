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
    const range = tag ? `${tag}..HEAD` : "HEAD";
    const commits = execSync(`git log ${range} --pretty=format:"%s"`, {
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
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

    // Check for breaking changes
    if (
      lowerCommit.includes("breaking change") ||
      lowerCommit.includes("!") ||
      /^[^:]+!:/.test(lowerCommit)
    ) {
      hasBreaking = true;
      break; // Major bump takes precedence
    }

    // Check for features
    if (lowerCommit.startsWith("feat:")) {
      hasFeature = true;
    }

    // Check for fixes
    if (lowerCommit.startsWith("fix:")) {
      hasFix = true;
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
  const relevantCommits = commits.filter(
    (commit) =>
      !commit.toLowerCase().startsWith("chore: bump version") &&
      !commit.toLowerCase().startsWith("chore(release):") &&
      !commit.toLowerCase().startsWith("merge")
  );

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
  } catch (error) {
    console.error("Error calculating next version:", error.message);
    process.exit(1);
  }
};

main();
