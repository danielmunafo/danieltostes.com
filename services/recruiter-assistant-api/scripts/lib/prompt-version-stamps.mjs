import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const PROMPT_REGISTRY_IDENTIFIER = "PROMPT_REGISTRY";
const PROMPT_ID_PROPERTY = "promptId";
const VERSION_PROPERTY = "version";
const STAGE_PROPERTY = "stage";

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

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function stringProperty(objectLiteral, propertyName) {
  const property = objectLiteral.properties.find((candidate) => {
    if (!ts.isPropertyAssignment(candidate)) return false;
    return propertyNameText(candidate.name) === propertyName;
  });
  if (!property || !ts.isPropertyAssignment(property)) return null;

  const initializer = unwrapExpression(property.initializer);
  if (
    ts.isStringLiteral(initializer) ||
    ts.isNoSubstitutionTemplateLiteral(initializer)
  ) {
    return initializer.text;
  }
  return null;
}

export function loadPromptVersionStamps(serviceRoot) {
  const registryPath = join(
    serviceRoot,
    "src/recruiterAssistant/prompt/promptRegistry.ts"
  );
  const sourceText = readFileSync(registryPath, "utf8");
  const sourceFile = ts.createSourceFile(
    registryPath,
    sourceText,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );
  const registryArray = findPromptRegistryArray(sourceFile);
  if (!registryArray) {
    throw new Error(
      `Could not find ${PROMPT_REGISTRY_IDENTIFIER} in ${registryPath}`
    );
  }

  const stamps = registryArray.elements.flatMap((element) => {
    const objectLiteral = unwrapExpression(element);
    if (!ts.isObjectLiteralExpression(objectLiteral)) return [];

    const promptId = stringProperty(objectLiteral, PROMPT_ID_PROPERTY);
    const version = stringProperty(objectLiteral, VERSION_PROPERTY);
    const stage = stringProperty(objectLiteral, STAGE_PROPERTY);
    if (!promptId || !version || !stage) return [];

    return [{ promptId, version, stage }];
  });
  if (stamps.length !== registryArray.elements.length) {
    throw new Error(`Could not read every prompt version in ${registryPath}`);
  }
  return stamps;
}

export function formatPromptVersionStamps(stamps) {
  return stamps
    .map(({ promptId, version }) => `${promptId}@${version}`)
    .join("  ");
}
