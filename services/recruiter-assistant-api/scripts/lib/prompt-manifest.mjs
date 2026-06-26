import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

export const PROMPT_MANIFEST_SCHEMA_VERSION = 1;
export const PROMPT_HASH_ALGORITHM = "sha256";
export const PROMPT_HASH_JOINER = "\n";
export const PROMPT_MANIFEST_REPO_PATH =
  "services/recruiter-assistant-api/prompts.manifest.json";

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const PROMPT_REGISTRY_IDENTIFIER = "PROMPT_REGISTRY";
const REGISTRY_REPO_PATH = "src/recruiterAssistant/prompt/promptRegistry.ts";
const RECRUITER_ASSISTANT_SOURCE_DIR = "src/recruiterAssistant";
const SOURCE_PROPERTY = "source";

function createSourceFile(filePath) {
  const sourceText = readFileSync(filePath, "utf8");
  return ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function getPropertyAssignment(objectLiteral, propertyName) {
  const property = objectLiteral.properties.find((candidate) => {
    return (
      ts.isPropertyAssignment(candidate) &&
      propertyNameText(candidate.name) === propertyName
    );
  });
  return property && ts.isPropertyAssignment(property) ? property : null;
}

function stringLiteralValue(expression, constants) {
  const initializer = unwrapExpression(expression);
  if (
    ts.isStringLiteral(initializer) ||
    ts.isNoSubstitutionTemplateLiteral(initializer)
  ) {
    return initializer.text;
  }
  if (ts.isIdentifier(initializer)) {
    return constants.get(initializer.text) ?? null;
  }
  return null;
}

function stringProperty(objectLiteral, propertyName, constants) {
  const property = getPropertyAssignment(objectLiteral, propertyName);
  if (!property) return null;
  return stringLiteralValue(property.initializer, constants);
}

function stringArrayProperty(objectLiteral, propertyName, constants) {
  const property = getPropertyAssignment(objectLiteral, propertyName);
  if (!property) return null;

  const initializer = unwrapExpression(property.initializer);
  if (!ts.isArrayLiteralExpression(initializer)) return null;

  const values = initializer.elements.map((element) =>
    stringLiteralValue(element, constants)
  );
  if (values.some((value) => value === null)) return null;
  return values;
}

function collectStringConstants(sourceFile) {
  const constants = new Map();

  function visit(node) {
    if (ts.isVariableStatement(node)) {
      const isConst =
        (ts.getCombinedNodeFlags(node.declarationList) & ts.NodeFlags.Const) !==
        0;
      if (isConst) {
        for (const declaration of node.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
            continue;
          }
          const value = stringLiteralValue(declaration.initializer, constants);
          if (value !== null) constants.set(declaration.name.text, value);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return constants;
}

function findPromptRegistryArray(sourceFile) {
  let registryArray = null;

  function visit(node) {
    if (registryArray) return;
    const isRegistryDeclaration =
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === PROMPT_REGISTRY_IDENTIFIER &&
      node.initializer;
    if (isRegistryDeclaration) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isArrayLiteralExpression(initializer)) {
        registryArray = initializer;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return registryArray;
}

function parsePromptSource(objectLiteral, constants, promptId) {
  const sourceProperty = getPropertyAssignment(objectLiteral, SOURCE_PROPERTY);
  if (!sourceProperty) {
    throw new Error(`${promptId}: missing source property`);
  }

  const source = unwrapExpression(sourceProperty.initializer);
  if (!ts.isObjectLiteralExpression(source)) {
    throw new Error(`${promptId}: source must be an object literal`);
  }

  const kind = stringProperty(source, "kind", constants);
  if (kind === "file") {
    const files = stringArrayProperty(source, "files", constants);
    if (!files?.length) {
      throw new Error(`${promptId}: file prompt source must include files`);
    }
    return { kind, files };
  }

  if (kind === "inline") {
    const modulePath = stringProperty(source, "module", constants);
    const symbol = stringProperty(source, "symbol", constants);
    if (!modulePath || !symbol) {
      throw new Error(
        `${promptId}: inline prompt source must include module and symbol`
      );
    }
    return { kind, module: modulePath, symbol };
  }

  throw new Error(`${promptId}: unsupported prompt source kind ${kind}`);
}

export function readPromptRegistry(serviceRoot) {
  const registryPath = join(serviceRoot, REGISTRY_REPO_PATH);
  const sourceFile = createSourceFile(registryPath);
  const constants = collectStringConstants(sourceFile);
  const registryArray = findPromptRegistryArray(sourceFile);
  if (!registryArray) {
    throw new Error(
      `Could not find ${PROMPT_REGISTRY_IDENTIFIER} in ${registryPath}`
    );
  }

  const prompts = registryArray.elements.map((element, index) => {
    const objectLiteral = unwrapExpression(element);
    if (!ts.isObjectLiteralExpression(objectLiteral)) {
      throw new Error(`Prompt registry entry ${index + 1} is not an object`);
    }

    const promptId = stringProperty(objectLiteral, "promptId", constants);
    if (!promptId) {
      throw new Error(`Prompt registry entry ${index + 1} is missing promptId`);
    }

    const version = stringProperty(objectLiteral, "version", constants);
    const stage = stringProperty(objectLiteral, "stage", constants);
    const lastUpdated = stringProperty(objectLiteral, "lastUpdated", constants);
    if (!version || !stage || !lastUpdated) {
      throw new Error(
        `${promptId}: registry entry must include version, stage, and lastUpdated`
      );
    }

    return {
      promptId,
      version,
      stage,
      source: parsePromptSource(objectLiteral, constants, promptId),
      lastUpdated,
    };
  });

  return prompts;
}

function extractStringSymbol(modulePath, symbolName) {
  const sourceFile = createSourceFile(modulePath);
  let match = null;

  function visit(node) {
    if (match !== null) return;
    const isMatchingDeclaration =
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === symbolName &&
      node.initializer;
    if (isMatchingDeclaration) {
      match = stringLiteralValue(node.initializer, new Map());
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (match === null) {
    throw new Error(
      `Could not read inline prompt ${symbolName} in ${modulePath}`
    );
  }
  return match;
}

export function promptTextForSource(serviceRoot, source) {
  if (source.kind === "file") {
    return source.files
      .map((file) =>
        readFileSync(
          join(serviceRoot, RECRUITER_ASSISTANT_SOURCE_DIR, file),
          "utf8"
        )
      )
      .join(PROMPT_HASH_JOINER);
  }

  if (source.kind === "inline") {
    return extractStringSymbol(join(serviceRoot, source.module), source.symbol);
  }

  throw new Error(`Unsupported prompt source kind ${source.kind}`);
}

export function hashPromptText(text) {
  return createHash(PROMPT_HASH_ALGORITHM).update(text, "utf8").digest("hex");
}

export function generatePromptManifest(serviceRoot) {
  const prompts = readPromptRegistry(serviceRoot).map((prompt) => ({
    promptId: prompt.promptId,
    version: prompt.version,
    stage: prompt.stage,
    source: prompt.source,
    contentHash: hashPromptText(
      promptTextForSource(serviceRoot, prompt.source)
    ),
    lastUpdated: prompt.lastUpdated,
  }));

  return {
    schemaVersion: PROMPT_MANIFEST_SCHEMA_VERSION,
    hashAlgorithm: PROMPT_HASH_ALGORITHM,
    hashInput: {
      fileJoiner: PROMPT_HASH_JOINER,
      fileBase: RECRUITER_ASSISTANT_SOURCE_DIR,
    },
    prompts,
  };
}

export function manifestPath(serviceRoot) {
  return join(serviceRoot, "prompts.manifest.json");
}

export function readCommittedManifest(serviceRoot) {
  const path = manifestPath(serviceRoot);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writePromptManifest(serviceRoot, manifest) {
  writeFileSync(
    manifestPath(serviceRoot),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
}

export function findMergeBase(baseRef = "origin/main") {
  try {
    return execFileSync("git", ["merge-base", "HEAD", baseRef], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function readManifestFromGit(ref) {
  try {
    const raw = execFileSync(
      "git",
      ["show", `${ref}:${PROMPT_MANIFEST_REPO_PATH}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function indexManifestPrompts(manifest) {
  return new Map(
    (manifest?.prompts ?? []).map((prompt) => [prompt.promptId, prompt])
  );
}

function parseSemver(version) {
  const match = SEMVER_PATTERN.exec(version);
  if (!match) return null;
  return match.slice(1).map((part) => Number(part));
}

export function compareSemver(left, right) {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);
  if (!parsedLeft || !parsedRight) return null;

  for (let index = 0; index < parsedLeft.length; index += 1) {
    if (parsedLeft[index] !== parsedRight[index]) {
      return Math.sign(parsedLeft[index] - parsedRight[index]);
    }
  }
  return 0;
}

function isDateBefore(left, right) {
  return left.localeCompare(right) < 0;
}

export function findPromptVersionBumpViolations(baseManifest, currentManifest) {
  const previousById = indexManifestPrompts(baseManifest);
  const violations = [];

  for (const current of currentManifest?.prompts ?? []) {
    const previous = previousById.get(current.promptId);
    if (!previous) continue;
    if (current.contentHash === previous.contentHash) continue;

    const versionComparison = compareSemver(current.version, previous.version);
    const versionWasBumped =
      versionComparison !== null && versionComparison > 0;
    const dateChanged = current.lastUpdated !== previous.lastUpdated;
    const dateWentBackward = isDateBefore(
      current.lastUpdated,
      previous.lastUpdated
    );
    const reasons = [];

    if (!versionWasBumped) {
      reasons.push(
        `version must increase from ${previous.version} to a higher semver`
      );
    }
    if (!dateChanged) {
      reasons.push(`lastUpdated must change from ${previous.lastUpdated}`);
    }
    if (dateWentBackward) {
      reasons.push(
        `lastUpdated must not move backward from ${previous.lastUpdated}`
      );
    }

    if (reasons.length > 0) {
      violations.push({
        promptId: current.promptId,
        previous,
        current,
        reasons,
      });
    }
  }

  return violations;
}

export function formatPromptVersionBumpViolation(violation) {
  return (
    `  ${violation.promptId}: ${violation.reasons.join("; ")} ` +
    `(hash ${violation.previous.contentHash.slice(0, 12)} -> ${violation.current.contentHash.slice(
      0,
      12
    )})`
  );
}
