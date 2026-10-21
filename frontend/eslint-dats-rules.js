import fs from "fs";
import path from "path";

/** @type {Rule.RuleModule} */
const noAliasWithinSameDomainRule = {
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description: "Enforce relative imports when importing from the same subdomain within a global folder.",
    },
    messages: {
      useRelative:
        "Use relative imports within the same domain '{{domain}}'. Change '@{{folder}}/{{subdomain}}' to a relative path.",
    },
    schema: [
      {
        type: "object",
        properties: {
          globalFolders: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 1,
            uniqueItems: true,
          },
          srcDirName: {
            type: "string",
            minLength: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const globalFolders = Array.isArray(options.globalFolders) ? options.globalFolders : [];
    const srcDirName = typeof options.srcDirName === "string" ? options.srcDirName : "src";

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        // 1. We only care about alias imports (starting with @)
        if (!importSource.startsWith("@")) return;

        // 2. Get the current file's directory
        const filename = context.filename || context.getFilename();
        const currentFileDir = path.dirname(filename);

        // 3. Define the absolute path to your global src directory
        const cwd = context.cwd || context.getCwd();
        const srcDir = path.resolve(cwd, srcDirName);

        // Define which folders have subdomains that require subdomain-based import rules
        // const foldersWithSubdomains = ["core", "features"];

        // 5. Check each global folder
        for (const folder of globalFolders) {
          const aliasPrefix = `@${folder}/`;

          // Check if this import uses this alias
          if (!importSource.startsWith(aliasPrefix) && importSource !== `@${folder}`) continue;

          // Extract the subdomain from the import (e.g., @core/span-annotation -> span-annotation)
          const importSubdomain = importSource.slice(aliasPrefix.length).split("/")[0];

          // Get the global folder path
          const globalFolderPath = path.join(srcDir, folder);

          // Check if current file is within this global folder
          if (currentFileDir === globalFolderPath || currentFileDir.startsWith(globalFolderPath + path.sep)) {
            // Get the current file's subdomain
            const currentFileRelative = path.relative(globalFolderPath, currentFileDir);
            const currentSubdomain = currentFileRelative.split(path.sep)[0];

            // If both are in the same subdomain, relative imports should be used
            if (currentSubdomain === importSubdomain && currentSubdomain !== "" && currentSubdomain !== "..") {
              context.report({
                node: node.source,
                messageId: "useRelative",
                data: {
                  folder: folder,
                  subdomain: importSubdomain,
                  domain: `${folder}/${importSubdomain}`,
                },
                fix(fixer) {
                  // Calculate the target absolute path from alias
                  const aliasPrefix = `@${folder}/`;
                  const restPath = importSource.slice(aliasPrefix.length);
                  const targetPath = path.resolve(srcDir, folder, restPath);

                  // Calculate relative path from current file directory to target
                  let relativePath = path.relative(currentFileDir, targetPath);

                  // Normalize backslashes to forward slashes for cross-platform compatibility
                  relativePath = relativePath.replace(/\\/g, "/");

                  // Ensure it starts with . or ..
                  if (!relativePath.startsWith(".")) {
                    relativePath = "./" + relativePath;
                  }

                  return fixer.replaceText(node.source, `"${relativePath}"`);
                },
              });
              break;
            }
          }
        }
      },
    };
  },
};

/** @type {Rule.RuleModule} */
const enforceGlobalAliasesRule = {
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description: "Enforce path aliases for global folders based on resolved disk paths.",
    },
    messages: {
      useAlias: "Please use the '{{alias}}' alias instead of a relative path for the global '{{folder}}' folder.",
    },
    schema: [
      {
        type: "object",
        properties: {
          globalFolders: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 1,
            uniqueItems: true,
          },
          foldersWithSubdomains: {
            type: "array",
            items: { type: "string", minLength: 1 },
            uniqueItems: true,
          },
          srcDirName: {
            type: "string",
            minLength: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const globalFolders = Array.isArray(options.globalFolders) ? options.globalFolders : [];
    const foldersWithSubdomains = Array.isArray(options.foldersWithSubdomains) ? options.foldersWithSubdomains : [];
    const srcDirName = typeof options.srcDirName === "string" ? options.srcDirName : "src";

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        // 1. We only care about relative imports. Ignore aliases and npm packages.
        if (!importSource.startsWith(".")) return;

        // 2. Get the current file's directory
        const filename = context.filename || context.getFilename();
        const currentFileDir = path.dirname(filename);

        // 3. Resolve the absolute path of the file being imported
        const resolvedImportPath = path.resolve(currentFileDir, importSource);

        // 4. Define the absolute path to your global src directory
        const cwd = context.cwd || context.getCwd();
        const srcDir = path.resolve(cwd, srcDirName);

        for (const folder of globalFolders) {
          // e.g., /your-project/src/components
          const globalFolderPath = path.join(srcDir, folder);

          // 6. Check if the resolved import points to the global folder
          // We append path.sep (/) to ensure we don't accidentally match a folder like /src/components-extra
          if (resolvedImportPath === globalFolderPath || resolvedImportPath.startsWith(globalFolderPath + path.sep)) {
            // For folders without subdomains, allow relative imports only if current file is also in the same folder
            // e.g., files in /src/store can import from other /src/store files using relative paths
            if (!foldersWithSubdomains.includes(folder)) {
              if (currentFileDir === globalFolderPath || currentFileDir.startsWith(globalFolderPath + path.sep)) {
                return;
              }
            }

            // For folders with subdomains, allow relative imports only within the same subdomain
            // e.g., files in /src/core/span-annotation can import from /src/core/span-annotation
            // But files in /src/core/span-annotation importing from /src/core/code should use @core alias
            const currentFileRelative = path.relative(globalFolderPath, currentFileDir);
            const importRelative = path.relative(globalFolderPath, path.dirname(resolvedImportPath));

            // Extract the first directory segment (the subdomain)
            const currentSubdomain = currentFileRelative.split(path.sep)[0];
            const importSubdomain = importRelative.split(path.sep)[0];

            // Allow relative imports within the same subdomain
            if (currentSubdomain === importSubdomain && currentSubdomain !== "" && currentSubdomain !== "..") {
              return;
            }

            context.report({
              node: node.source,
              messageId: "useAlias",
              data: {
                alias: `@${folder}`,
                folder: folder,
              },
              fix(fixer) {
                // Calculate relative path from global folder
                let relativePath = path.relative(globalFolderPath, resolvedImportPath);

                // Handle index files - use directory instead of index.ts
                const filename = path.basename(relativePath);
                if (
                  filename === "index.ts" ||
                  filename === "index.tsx" ||
                  filename === "index.js" ||
                  filename === "index.jsx"
                ) {
                  relativePath = path.dirname(relativePath);
                } else {
                  // Remove file extension for other files
                  const ext = path.extname(relativePath);
                  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
                    relativePath = relativePath.slice(0, -ext.length);
                  }
                }

                // Normalize backslashes to forward slashes for cross-platform compatibility
                relativePath = relativePath.replace(/\\/g, "/");

                const aliasImport = `@${folder}/${relativePath}`;
                return fixer.replaceText(node.source, `"${aliasImport}"`);
              },
            });

            // Only report once per import
            break;
          }
        }
      },
    };
  },
};

/** @type {Rule.RuleModule} */
const noPrivateFolderScopeViolationRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce that private folders (prefixed with _) can only be accessed from within their own scope.",
    },
    messages: {
      privateFolder:
        "Cannot access private folder '{{privatePath}}'. Private folders can only be imported from within their own scope. The importing file must be located within '{{allowedScope}}'.",
    },
    schema: [
      {
        type: "object",
        properties: {
          privatePrefixes: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const privatePrefixes = Array.isArray(options.privatePrefixes) ? options.privatePrefixes : [];

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        // 1. Only check relative imports
        if (!importSource.startsWith(".")) return;

        // 2. Get the current file's directory and resolve the absolute import path
        const filename = context.filename || context.getFilename();
        const currentFileDir = path.dirname(filename);
        const resolvedImportPath = path.resolve(currentFileDir, importSource);

        // 3. Split the resolved path into parts
        const pathParts = resolvedImportPath.split(path.sep);

        // 4. Find all private folder segments (prefixed with _) in the import path
        let privateSegmentIndices = [];
        for (let i = 0; i < pathParts.length; i++) {
          if (privatePrefixes.some((prefix) => pathParts[i].startsWith(prefix))) {
            privateSegmentIndices.push(i);
          }
        }

        // No private folders in this import path, so it's OK
        if (privateSegmentIndices.length === 0) return;

        // 5. For each private folder found, check if the current file is in the allowed scope
        for (const privateIndex of privateSegmentIndices) {
          // The "parent scope" of a private folder is its direct parent directory
          // e.g., for /features/my-feature/views/main/_components
          // the parent is /features/my-feature/views/main
          const allowedScopeDir = pathParts.slice(0, privateIndex).join(path.sep);

          // Check if the current file is within the allowed scope
          const currentFileAbsolute = path.resolve(currentFileDir);
          const isInScope =
            currentFileAbsolute === allowedScopeDir || currentFileAbsolute.startsWith(allowedScopeDir + path.sep);

          if (!isInScope) {
            // Find the display path for better error message
            const srcIndex = pathParts.indexOf("src");
            const displayParts = srcIndex !== -1 ? pathParts.slice(srcIndex) : pathParts;

            // Index of the private folder in the display parts
            const displayPrivateIndex = displayParts.findIndex((part) =>
              privatePrefixes.some((prefix) => part.startsWith(prefix)),
            );

            const privateFolderDisplay = displayParts.slice(0, displayPrivateIndex + 1).join("/");
            const allowedScopeDisplay = displayParts.slice(0, displayPrivateIndex).join("/");

            context.report({
              node: node.source,
              messageId: "privateFolder",
              data: {
                privatePath: privateFolderDisplay,
                allowedScope: allowedScopeDisplay,
              },
            });
            break; // Report only once per import
          }
        }
      },
    };
  },
};

/** @type {Rule.RuleModule} */
const noInternalModulesPublicEntryRule = {
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description:
        "Disallow deep imports into internal modules for selected aliases and auto-fix to their public entry import.",
    },
    messages: {
      noInternal: "Reaching to '{{importPath}}' is not allowed. Import from '{{publicImport}}' instead.",
    },
    schema: [
      {
        type: "object",
        properties: {
          aliases: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 1,
            uniqueItems: true,
          },
          depth: {
            type: "integer",
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const restrictedAliases = Array.isArray(options.aliases) ? options.aliases : [];
    const minDisallowedDepth = Number.isInteger(options.depth) ? options.depth : 2;

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        if (typeof importSource !== "string") return;
        if (!importSource.startsWith("@")) return;

        for (const alias of restrictedAliases) {
          const prefix = `@${alias}/`;
          if (!importSource.startsWith(prefix)) continue;

          const pathSegments = importSource.slice(prefix.length).split("/").filter(Boolean);

          // Report when import depth reaches the configured threshold.
          // depth=2 means @core/memo is allowed, @core/memo/* is disallowed.
          if (pathSegments.length < minDisallowedDepth) return;

          const publicImport = `@${alias}/${pathSegments[0]}`;

          context.report({
            node: node.source,
            messageId: "noInternal",
            data: {
              importPath: importSource,
              publicImport,
            },
            fix(fixer) {
              return fixer.replaceText(node.source, `"${publicImport}"`);
            },
          });

          return;
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// no-cross-slice-access rule
// ---------------------------------------------------------------------------

/** Cache: srcDir → Map<sliceName, { ownerDir: string | null }> */
const sliceMapsCache = new Map();

function findSliceFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSliceFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith("Slice.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Builds a map of Redux slice name → { ownerDir, filePath }.
 * ownerDir = null means the slice is global (no restriction).
 *
 * Ownership rules:
 *  - Slices in globalSlicePaths (default: ["store/global"]) → global, no restriction.
 *  - Slices in a directory named "store" → owner scope is the *parent* of that store dir
 *    (e.g. features/annotation/store/annoSlice.ts → owner: features/annotation/).
 *  - All other slices → owner scope is the directory containing the slice file.
 */
function buildSliceMap(srcDir, globalSlicePaths) {
  if (sliceMapsCache.has(srcDir)) return sliceMapsCache.get(srcDir);

  const sliceFiles = findSliceFiles(srcDir);
  const map = new Map();

  for (const filePath of sliceFiles) {
    let content;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const createSliceIdx = content.indexOf("createSlice(");
    if (createSliceIdx === -1) continue;

    // Extract slice name from the first 500 chars after createSlice(
    const snippet = content.slice(createSliceIdx, createSliceIdx + 500);
    const nameMatch = snippet.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
    if (!nameMatch) continue;

    const sliceName = nameMatch[1];
    const fileDir = path.dirname(filePath);
    const relDir = path.relative(srcDir, fileDir).replace(/\\/g, "/");

    const isGlobal = globalSlicePaths.some((gp) => relDir === gp || relDir.startsWith(gp + "/"));

    let ownerDir;
    if (isGlobal) {
      ownerDir = null;
    } else if (path.basename(fileDir) === "store") {
      // Slice lives in a 'store/' subfolder → scope is the parent domain folder
      ownerDir = path.dirname(fileDir);
    } else {
      ownerDir = fileDir;
    }

    map.set(sliceName, { ownerDir, filePath });
  }

  sliceMapsCache.set(srcDir, map);
  return map;
}

/** Recursively collect all state.<sliceName> member expressions inside a selector. */
function collectStateAccesses(node, stateParamName, results) {
  if (!node || typeof node !== "object") return;
  if (
    node.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    node.object.name === stateParamName &&
    node.property.type === "Identifier"
  ) {
    results.push({ sliceName: node.property.name, node });
    return; // don't recurse further into this expression
  }
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((item) => {
        if (item && typeof item === "object" && typeof item.type === "string") {
          collectStateAccesses(item, stateParamName, results);
        }
      });
    } else if (child && typeof child === "object" && typeof child.type === "string") {
      collectStateAccesses(child, stateParamName, results);
    }
  }
}

/** @type {Rule.RuleModule} */
const noCrossSliceAccessRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent files from accessing Redux slices that are outside their scope via useAppSelector. " +
        "Slice ownership is auto-detected from *Slice.ts file locations: a slice in featureA/store/ is " +
        "scoped to featureA/, while a slice directly in core/memo/dialog/ is scoped to core/memo/dialog/. " +
        "Slices in store/global/ (configurable) are unrestricted.",
    },
    messages: {
      crossSliceAccess:
        "Cannot access slice '{{sliceName}}' here. " +
        "This slice is owned by '{{ownerDir}}' and is not accessible from '{{currentDir}}'. " +
        "Lift the state up to a shared parent scope or pass it as a prop.",
    },
    schema: [
      {
        type: "object",
        properties: {
          srcDirName: { type: "string", minLength: 1 },
          globalSlicePaths: {
            type: "array",
            items: { type: "string" },
            description: "Paths relative to srcDir that contain global (unrestricted) slices.",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const srcDirName = typeof options.srcDirName === "string" ? options.srcDirName : "src";
    const globalSlicePaths = Array.isArray(options.globalSlicePaths) ? options.globalSlicePaths : ["store/global"];

    const cwd = context.cwd || context.getCwd();
    const srcDir = path.resolve(cwd, srcDirName);
    const sliceMap = buildSliceMap(srcDir, globalSlicePaths);

    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "useAppSelector") return;

        const filename = context.filename || context.getFilename();
        if (!filename.startsWith(srcDir + path.sep)) return;

        const selectorArg = node.arguments[0];
        if (!selectorArg) return;
        if (selectorArg.type !== "ArrowFunctionExpression" && selectorArg.type !== "FunctionExpression") return;
        if (selectorArg.params.length === 0 || selectorArg.params[0].type !== "Identifier") return;

        const stateParamName = selectorArg.params[0].name;
        const accesses = [];
        collectStateAccesses(selectorArg.body, stateParamName, accesses);

        const currentFileDir = path.dirname(filename);

        for (const { sliceName, node: accessNode } of accesses) {
          const sliceInfo = sliceMap.get(sliceName);
          if (!sliceInfo) continue; // unknown slice — don't restrict
          if (sliceInfo.ownerDir === null) continue; // global slice — always allowed

          const isInScope =
            currentFileDir === sliceInfo.ownerDir || currentFileDir.startsWith(sliceInfo.ownerDir + path.sep);

          if (!isInScope) {
            context.report({
              node: accessNode,
              messageId: "crossSliceAccess",
              data: {
                sliceName,
                ownerDir: path.relative(srcDir, sliceInfo.ownerDir).replace(/\\/g, "/"),
                currentDir: path.relative(srcDir, currentFileDir).replace(/\\/g, "/"),
              },
            });
          }
        }
      },
    };
  },
};

/** @type {Rule.RuleModule} */
const noScopeViolationsRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: {
      description:
        "Enforce that relative imports do not cross into sibling directory branches. You can only import from your own directory tree, parent levels, or shared root folders.",
    },
    messages: {
      crossSiblingBranch:
        "Cannot import from sibling branch {{importBranch}}. Current file is in branch {{currentBranch}}. Either import from parent directory, same directory, use alias imports, or move shared code to a parent folder.",
    },
    schema: [
      {
        type: "object",
        properties: {
          sharedFolders: {
            type: "array",
            items: { type: "string", minLength: 1 },
            description:
              "Folder names at the feature root that are shared and can be accessed from anywhere (e.g., ['store', 'api', 'hooks'])",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const sharedFolders = Array.isArray(options.sharedFolders) ? options.sharedFolders : [];

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        // Only check relative imports
        if (typeof importSource !== "string" || !importSource.startsWith(".")) return;

        // Get current file path
        const filename = context.filename || context.getFilename();
        const currentFileDir = path.dirname(filename);
        const resolvedImportPath = path.resolve(currentFileDir, importSource);
        const importDir = path.dirname(resolvedImportPath);

        // Normalize paths to use forward slashes
        const currentParts = currentFileDir.split(path.sep).filter(Boolean);
        const importParts = importDir.split(path.sep).filter(Boolean);

        // Find the common ancestor (longest matching prefix)
        let commonAncestorDepth = 0;
        for (let i = 0; i < Math.min(currentParts.length, importParts.length); i++) {
          if (currentParts[i] === importParts[i]) {
            commonAncestorDepth = i + 1;
          } else {
            break;
          }
        }

        // If paths diverge, check if we're crossing sibling branches
        if (commonAncestorDepth < Math.max(currentParts.length, importParts.length)) {
          // Get the immediate child of the common ancestor for each path
          const currentBranch = currentParts[commonAncestorDepth];
          const importBranch = importParts[commonAncestorDepth];

          // If both branches exist and differ, check if one is a shared folder
          if (currentBranch && importBranch && currentBranch !== importBranch) {
            // Allow if the import branch is a configured shared folder
            if (sharedFolders.includes(importBranch)) {
              return;
            }

            // Block if we're crossing into a sibling organizational branch
            context.report({
              node: node.source,
              messageId: "crossSiblingBranch",
              data: {
                currentBranch,
                importBranch,
              },
            });
          }
        }
      },
    };
  },
};

/** @type {Rule.RuleModule} */
const queriesFileMatchesRootKeyRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: {
      description:
        "A *Queries.ts file is named after the root query key of its factory: all: () => ['tag'] -> tagQueries.ts",
    },
    messages: {
      mismatch: "The root query key '{{key}}' requires this file to be named '{{expected}}', not '{{actual}}'.",
    },
    schema: [],
  },
  create(context) {
    const actual = path.basename(context.filename || context.getFilename());
    if (!actual.endsWith("Queries.ts")) return {};
    return {
      "CallExpression[callee.name='createJobQueries']"(node) {
        const first = node.arguments[0];
        if (!first || first.type !== "Literal" || typeof first.value !== "string") return;
        const expected = `${first.value}Queries.ts`;
        if (expected === actual) return;
        context.report({ node: first, messageId: "mismatch", data: { key: first.value, expected, actual } });
      },
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ObjectExpression > Property[key.name='all'] > ArrowFunctionExpression > TSAsExpression > ArrayExpression"(
        node,
      ) {
        const first = node.elements[0];
        if (node.elements.length !== 1 || !first || first.type !== "Literal" || typeof first.value !== "string") return;
        const expected = `${first.value}Queries.ts`;
        if (expected === actual) return;
        context.report({ node: first, messageId: "mismatch", data: { key: first.value, expected, actual } });
      },
    };
  },
};

/** @type {ESLint.Plugin} */
export const datsRulesPlugin = {
  rules: {
    "no-alias-within-same-domain": noAliasWithinSameDomainRule,
    "enforce-global-aliases": enforceGlobalAliasesRule,
    "no-private-folder-scope-violation": noPrivateFolderScopeViolationRule,
    "no-internal-modules-public-entry": noInternalModulesPublicEntryRule,
    "no-cross-slice-access": noCrossSliceAccessRule,
    "no-scope-violations": noScopeViolationsRule,
    "queries-file-matches-root-key": queriesFileMatchesRootKeyRule,
  },
};

// QUERY FACTORIES AND HOOKS OBJECTS (see .github/instructions/frontend-api.instructions.md)

const QUERY_OPTIONS_BUILDERS = new Set(["queryOptions", "infiniteQueryOptions"]);

/** The expression an arrow function returns (expression body or a single top-level return), or null. */
const getReturnedExpression = (fn) => {
  if (fn.body.type !== "BlockStatement") return fn.body;
  const ret = fn.body.body.find((statement) => statement.type === "ReturnStatement");
  return ret?.argument ?? null;
};

const unwrapTsExpression = (node) =>
  node && (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") ? node.expression : node;

/** `xQueries.name(...)` -> "name" (only member calls on the factory itself). */
const getFactoryCallName = (node, factoryName) => {
  if (node?.type !== "CallExpression" || node.callee.type !== "MemberExpression") return null;
  const { object, property } = node.callee;
  if (object.type !== "Identifier" || object.name !== factoryName || property.type !== "Identifier") return null;
  return property.name;
};

/** @type {Rule.RuleModule} */
const queryFactoryShapeRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: {
      description:
        "A query factory consists of all(), key prefixes named *Scope and queryOptions leaves whose keys start with their own scope.",
    },
    messages: {
      prefixName: "A key prefix of a query factory is named '<leaf>Scope' or '<leaf>Of<Param>Scope', not '{{name}}'.",
      leafScope:
        "The queryKey of the leaf '{{name}}' must start with ...{{factory}}.{{name}}Scope() (or {{name}}Of<Param>Scope(...)).",
      leafRoot: "The queryKey of the leaf '{{name}}' (no params) must start with ...{{factory}}.all().",
    },
    schema: [],
  },
  create(context) {
    return {
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type='ObjectExpression']"(declarator) {
        if (declarator.id.type !== "Identifier" || !declarator.id.name.endsWith("Queries")) return;
        const factory = declarator.id.name;
        for (const property of declarator.init.properties) {
          if (property.type !== "Property" || property.key.type !== "Identifier") continue;
          const name = property.key.name;
          if (name === "all" || property.value.type !== "ArrowFunctionExpression") continue;
          const returned = unwrapTsExpression(getReturnedExpression(property.value));
          if (!returned) continue;

          // key prefix: () => [...xQueries.all(), "segment"] as const
          if (returned.type === "ArrayExpression") {
            if (!name.endsWith("Scope"))
              context.report({ node: property.key, messageId: "prefixName", data: { name } });
            continue;
          }

          // leaf: (...) => queryOptions({ queryKey: [...], ... })
          if (
            returned.type !== "CallExpression" ||
            returned.callee.type !== "Identifier" ||
            !QUERY_OPTIONS_BUILDERS.has(returned.callee.name)
          ) {
            continue;
          }
          const options = returned.arguments[0];
          if (options?.type !== "ObjectExpression") continue;
          const keyProperty = options.properties.find(
            (option) =>
              option.type === "Property" && option.key.type === "Identifier" && option.key.name === "queryKey",
          );
          const key = unwrapTsExpression(keyProperty?.value);
          // keys built elsewhere (e.g. tableInfoQueries.byDomain) are not checked
          if (key?.type !== "ArrayExpression") continue;
          const first = key.elements[0];
          const prefix = first?.type === "SpreadElement" ? getFactoryCallName(first.argument, factory) : null;

          if (property.value.params.length === 0) {
            if (prefix !== "all") context.report({ node: key, messageId: "leafRoot", data: { name, factory } });
            continue;
          }
          const ownScope =
            prefix === `${name}Scope` ||
            (prefix !== null && prefix.startsWith(`${name}Of`) && prefix.endsWith("Scope"));
          if (!ownScope) context.report({ node: key, messageId: "leafScope", data: { name, factory } });
        }
      },
    };
  },
};

const toPascalCase = (name) => name.charAt(0).toUpperCase() + name.slice(1);

/** @type {Rule.RuleModule} */
const hooksObjectMatchesFileRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: { description: "A *Hooks.ts file exports the hooks object named after the file: tagHooks.ts -> TagHooks." },
    messages: {
      mismatch: "The hooks object of '{{file}}' must be named '{{expected}}', not '{{actual}}'.",
    },
    schema: [],
  },
  create(context) {
    const file = path.basename(context.filename || context.getFilename());
    if (!file.endsWith("Hooks.ts")) return {};
    const expected = toPascalCase(file.slice(0, -".ts".length));
    return {
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator"(declarator) {
        // hooks objects are PascalCase; a hook factory (createSearchViewHooks) is not checked
        if (declarator.id.type !== "Identifier" || !/^[A-Z]\w*Hooks$/.test(declarator.id.name)) return;
        if (declarator.id.name === expected) return;
        context.report({
          node: declarator.id,
          messageId: "mismatch",
          data: { file, expected, actual: declarator.id.name },
        });
      },
    };
  },
};

/** The hook (`const useX = ...`) a node is defined in, or null. */
const getEnclosingHookName = (node) => {
  for (let current = node.parent; current; current = current.parent) {
    if (
      current.type === "VariableDeclarator" &&
      current.id.type === "Identifier" &&
      /^use[A-Z]/.test(current.id.name) &&
      current.init?.type === "ArrowFunctionExpression"
    ) {
      return current.id.name;
    }
  }
  return null;
};

/** @type {Rule.RuleModule} */
const mutationKeyMatchesHookRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: {
      description:
        "The mutationKey of a hook starts with a root (xQueries.all(), a scope or a root key constant) and ends with the hook name without 'use': useCreateTag -> 'createTag'.",
    },
    messages: {
      root: "A mutationKey starts with its domain root: mutationKey: [...xQueries.all(), '{{expected}}'].",
      name: "The mutationKey of '{{hook}}' must end with '{{expected}}' (job start mutations: [...xQueries.job.all(), 'start']).",
    },
    schema: [],
  },
  create(context) {
    return {
      "CallExpression[callee.name='useMutation'] > ObjectExpression > Property[key.name='mutationKey'] > ArrayExpression"(
        key,
      ) {
        const hook = getEnclosingHookName(key);
        if (!hook) return;
        const expected = hook.charAt(3).toLowerCase() + hook.slice(4);
        const first = key.elements[0];
        if (first?.type !== "SpreadElement") {
          context.report({ node: key, messageId: "root", data: { expected } });
          return;
        }
        const last = key.elements[key.elements.length - 1];
        const lastValue = last?.type === "Literal" ? last.value : null;
        const isJobStart =
          lastValue === "start" &&
          first.argument.type === "CallExpression" &&
          first.argument.callee.type === "MemberExpression" &&
          first.argument.callee.object.type === "MemberExpression" &&
          first.argument.callee.object.property.type === "Identifier" &&
          first.argument.callee.object.property.name === "job";
        if (lastValue === expected || isJobStart) return;
        context.report({ node: last ?? key, messageId: "name", data: { hook, expected } });
      },
    };
  },
};

/** @type {Rule.RuleModule} */
const noForwardingQueryHookRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: {
      description:
        "A query hook must add something (select, enabled, Redux state, polling, ...); a hook that only forwards its arguments to a factory leaf is forbidden.",
    },
    messages: {
      forwarding:
        "'{{hook}}' only forwards its arguments to a query factory leaf. Remove it and call useQuery(xQueries.leaf(...)) at the call site.",
    },
    schema: [],
  },
  create(context) {
    return {
      "VariableDeclarator > ArrowFunctionExpression"(fn) {
        const declarator = fn.parent;
        if (declarator.id.type !== "Identifier" || !/^use[A-Z]/.test(declarator.id.name)) return;
        const returned = getReturnedExpression(fn);
        if (fn.body.type === "BlockStatement" && fn.body.body.length !== 1) return;
        if (returned?.type !== "CallExpression" || returned.callee.type !== "Identifier") return;
        if (!["useQuery", "useInfiniteQuery", "useSuspenseQuery"].includes(returned.callee.name)) return;
        const options = returned.arguments[0];
        const paramNames = new Set();
        for (const param of fn.params) {
          if (param.type === "Identifier") paramNames.add(param.name);
          const pattern = param.type === "AssignmentPattern" ? param.left : param;
          if (pattern.type === "ObjectPattern") {
            for (const prop of pattern.properties) {
              if (prop.type === "Property" && prop.value.type === "Identifier") paramNames.add(prop.value.name);
            }
          }
        }
        const isForwarding =
          options?.type === "CallExpression" ||
          (options?.type === "ObjectExpression" &&
            options.properties.every(
              (prop) =>
                prop.type === "SpreadElement" ||
                (prop.type === "Property" && prop.value.type === "Identifier" && paramNames.has(prop.value.name)),
            ));
        if (!isForwarding) return;
        context.report({ node: declarator.id, messageId: "forwarding", data: { hook: declarator.id.name } });
      },
    };
  },
};

datsRulesPlugin.rules["query-factory-shape"] = queryFactoryShapeRule;
datsRulesPlugin.rules["hooks-object-matches-file"] = hooksObjectMatchesFileRule;
datsRulesPlugin.rules["mutation-key-matches-hook"] = mutationKeyMatchesHookRule;
datsRulesPlugin.rules["no-forwarding-query-hook"] = noForwardingQueryHookRule;

// ---------------------------------------------------------------------------
// slice-conventions rule (see .github/instructions/frontend-slice.instructions.md)
// ---------------------------------------------------------------------------

const isMember = (node, objectName, propertyName) =>
  node?.type === "MemberExpression" &&
  node.object.type === "Identifier" &&
  node.object.name === objectName &&
  node.property.type === "Identifier" &&
  node.property.name === propertyName;

/** `xSlice.reducer` or `persistReducer({ key: xSlice.name, storage: persistStorage, ... }, xSlice.reducer)` */
const isSliceReducerValue = (node, sliceVar) => {
  if (isMember(node, sliceVar, "reducer")) return true;
  if (node?.type !== "CallExpression" || node.callee.type !== "Identifier" || node.callee.name !== "persistReducer") {
    return false;
  }
  const [config, reducer] = node.arguments;
  if (!isMember(reducer, sliceVar, "reducer") || config?.type !== "ObjectExpression") return false;
  const property = (name) =>
    config.properties.find((p) => p.type === "Property" && p.key.type === "Identifier" && p.key.name === name);
  const storage = property("storage");
  return (
    isMember(property("key")?.value, sliceVar, "name") &&
    storage?.value.type === "Identifier" &&
    storage.value.name === "persistStorage"
  );
};

/** @type {Rule.RuleModule} */
const sliceConventionsRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: {
      description:
        "A *Slice.ts file with createSlice names file, slice variable, slice name, XActions and xReducer after one x, " +
        "exports the reducer last as { [xSlice.name]: reducer } and imports Redux Toolkit from '@reduxjs/toolkit'.",
    },
    messages: {
      sliceVariable:
        "The createSlice result must be assigned to a camelCase const ending in 'Slice' (e.g. 'annotationsSlice').",
      sliceName: "The slice '{{sliceVar}}' must have name: \"{{expected}}\".",
      fileName: "The slice '{{sliceVar}}' must live in '{{expected}}'.",
      missingActions: "Export the actions of '{{sliceVar}}' as 'export const {{expected}} = {{sliceVar}}.actions'.",
      missingReducer:
        "Export the reducer of '{{sliceVar}}' as 'export const {{expected}} = { [{{sliceVar}}.name]: {{sliceVar}}.reducer }' " +
        "(or persistReducer({ key: {{sliceVar}}.name, storage: persistStorage }, {{sliceVar}}.reducer)) as the last statement.",
      reactImport: "Import Redux Toolkit from '@reduxjs/toolkit', not '@reduxjs/toolkit/react'.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!filename.endsWith("Slice.ts")) return {};
    const slices = [];
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@reduxjs/toolkit/react") context.report({ node, messageId: "reactImport" });
      },
      "VariableDeclarator[init.type='CallExpression'][init.callee.name='createSlice']"(node) {
        if (node.id.type !== "Identifier" || !/^[a-z][A-Za-z0-9]*Slice$/.test(node.id.name)) {
          context.report({ node: node.id, messageId: "sliceVariable" });
          return;
        }
        const sliceVar = node.id.name;
        const base = sliceVar.slice(0, -"Slice".length);
        slices.push({ node, sliceVar, base });
        const options = node.init.arguments[0];
        const nameProperty =
          options?.type === "ObjectExpression" &&
          options.properties.find((p) => p.type === "Property" && p.key.type === "Identifier" && p.key.name === "name");
        if (!nameProperty || nameProperty.value.type !== "Literal" || nameProperty.value.value !== base) {
          context.report({ node: nameProperty || node, messageId: "sliceName", data: { sliceVar, expected: base } });
        }
        if (path.basename(filename) !== `${sliceVar}.ts`) {
          context.report({ node: node.id, messageId: "fileName", data: { sliceVar, expected: `${sliceVar}.ts` } });
        }
      },
      "Program:exit"(program) {
        const exported = program.body
          .filter((s) => s.type === "ExportNamedDeclaration" && s.declaration?.type === "VariableDeclaration")
          .flatMap((s) => s.declaration.declarations.map((d) => ({ statement: s, declarator: d })));
        const last = program.body[program.body.length - 1];
        for (const { node, sliceVar, base } of slices) {
          const hasActions = exported.some(
            ({ declarator }) =>
              declarator.id.type === "Identifier" &&
              declarator.id.name.toLowerCase() === `${base}actions`.toLowerCase() &&
              isMember(declarator.init, sliceVar, "actions"),
          );
          if (!hasActions) {
            const expected = `${base.charAt(0).toUpperCase()}${base.slice(1)}Actions`;
            context.report({ node, messageId: "missingActions", data: { sliceVar, expected } });
          }
          const reducer = exported.find(
            ({ declarator }) => declarator.id.type === "Identifier" && declarator.id.name === `${base}Reducer`,
          );
          const value = reducer?.declarator.init;
          const property = value?.type === "ObjectExpression" && value.properties.length === 1 && value.properties[0];
          const isValid =
            reducer?.statement === last &&
            property?.type === "Property" &&
            property.computed &&
            isMember(property.key, sliceVar, "name") &&
            isSliceReducerValue(property.value, sliceVar);
          if (!isValid) {
            context.report({ node, messageId: "missingReducer", data: { sliceVar, expected: `${base}Reducer` } });
          }
        }
      },
    };
  },
};

datsRulesPlugin.rules["slice-conventions"] = sliceConventionsRule;

/** @type {Rule.RuleModule} */
const dialogConventionsRule = {
  meta: {
    type: "problem",
    fixable: false,
    docs: {
      description:
        "*Dialog.tsx files follow .github/instructions/frontend-dialog.instructions.md: plain function component, DATSDialogHeader + useDialogMaximize, open state from useDialogBus / useDialog, destructured mutate",
    },
    messages: {
      memo: "Dialogs are plain function components: write `export function {{name}}(...)` instead of wrapping it in memo().",
      header:
        "A dialog renders DATSDialogHeader (from @components/DATSDialogHeader) with useDialogMaximize instead of DialogTitle.",
      fullScreen: "Pass `fullScreen={isMaximized}` (from useDialogMaximize) to <Dialog>.",
      openState:
        "Do not keep the open state of a dialog in useState. Use useDialogBus(key) (global) or useDialog() from @hooks/useDialog (local).",
      mutate: "Destructure the mutation: `const { mutate: xMutation, isPending } = XHooks.useX();`",
    },
    schema: [],
  },
  create(context) {
    const filename = path.basename(context.filename || context.getFilename());
    if (!filename.endsWith("Dialog.tsx")) return {};
    let importsHeader = false;
    /** @type {import("estree").Node[]} */
    const dialogElements = [];
    return {
      "ImportDeclaration[source.value='@components/DATSDialogHeader']"() {
        importsHeader = true;
      },
      "ImportDeclaration[source.value='@mui/material'] > ImportSpecifier[imported.name='DialogTitle']"(node) {
        context.report({ node, messageId: "header" });
      },
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/Dialog$/] > CallExpression[callee.name='memo']"(
        node,
      ) {
        const declarator = /** @type {import("estree").VariableDeclarator} */ (
          /** @type {import("eslint").Rule.Node} */ (node).parent
        );
        const name = declarator.id.type === "Identifier" ? declarator.id.name : "Dialog";
        context.report({ node, messageId: "memo", data: { name } });
      },
      "JSXOpeningElement[name.name='Dialog']"(node) {
        dialogElements.push(node);
        const hasFullScreen = node.attributes.some(
          (attribute) => attribute.type === "JSXAttribute" && attribute.name.name === "fullScreen",
        );
        if (!hasFullScreen) context.report({ node, messageId: "fullScreen" });
      },
      "VariableDeclarator[id.type='ArrayPattern'] > CallExpression[callee.name='useState']"(node) {
        const declarator = /** @type {import("estree").VariableDeclarator} */ (
          /** @type {import("eslint").Rule.Node} */ (node).parent
        );
        if (declarator.id.type !== "ArrayPattern") return;
        const first = declarator.id.elements[0];
        if (first?.type === "Identifier" && /^(is)?[oO]pen$/.test(first.name)) {
          context.report({ node, messageId: "openState" });
        }
      },
      "CallExpression > MemberExpression.callee[property.name='mutate']"(node) {
        context.report({ node, messageId: "mutate" });
      },
      "Program:exit"() {
        if (importsHeader || dialogElements.length === 0) return;
        context.report({ node: dialogElements[0], messageId: "header" });
      },
    };
  },
};

datsRulesPlugin.rules["dialog-conventions"] = dialogConventionsRule;

// FILTER TABLES AND FILTER SLICES (see .github/instructions/frontend-filter.instructions.md)

/**
 * A `<Prefix>FilterTable.tsx` exports exactly the three variants `<Prefix>ReduxFilterTable`, `<Prefix>URLFilterTable` and
 * `<Prefix>LocalFilterTable`, and types its columns without `as MRT_ColumnDef` casts.
 * @type {Rule.RuleModule}
 */
const filterTableShapeRule = {
  meta: {
    type: "problem",
    docs: { description: "Enforce the exports and the column typing of a <Prefix>FilterTable.tsx." },
    messages: {
      missingVariant: "{{file}} must export {{name}} (every filter table has a Redux, URL and Local variant).",
      extraExport: "{{file}} may only export its three variants; move '{{name}}' to its own file.",
      columnCast:
        "Do not cast to MRT_ColumnDef. Annotate the map callback instead: tableInfo.map((column): MRT_ColumnDef<Row> => ...).",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const base = path.basename(filename);
    const prefix = base.replace(/FilterTable\.tsx$/, "");
    if (!prefix || prefix === base) return {};
    const expected = ["Redux", "URL", "Local"].map((variant) => `${prefix}${variant}FilterTable`);
    const exported = new Set();
    const isColumnDef = (type) =>
      (type.type === "TSTypeReference" &&
        type.typeName.type === "Identifier" &&
        type.typeName.name === "MRT_ColumnDef") ||
      (type.type === "TSArrayType" && isColumnDef(type.elementType));

    return {
      ExportNamedDeclaration(node) {
        const names = node.declaration
          ? node.declaration.type === "VariableDeclaration"
            ? node.declaration.declarations.map((declarator) => declarator.id.name)
            : [node.declaration.id?.name]
          : node.specifiers.map((specifier) => specifier.exported.name);
        names.forEach((name) => {
          if (expected.includes(name)) {
            exported.add(name);
            return;
          }
          context.report({ node, messageId: "extraExport", data: { file: base, name } });
        });
      },
      ExportDefaultDeclaration(node) {
        context.report({ node, messageId: "extraExport", data: { file: base, name: "default" } });
      },
      TSAsExpression(node) {
        if (isColumnDef(node.typeAnnotation)) context.report({ node, messageId: "columnCast" });
      },
      "Program:exit"(node) {
        expected
          .filter((name) => !exported.has(name))
          .forEach((name) => context.report({ node, messageId: "missingVariant", data: { file: base, name } }));
      },
    };
  },
};

/**
 * A `<prefix>FilterSlice.ts` creates the slice `<prefix>Filter` from `filterReducer`, resets it on project change with
 * `resetProjectFilterState`, and exports `default<Prefix>FilterExpression`, `<Prefix>FilterActions` and
 * `<prefix>FilterReducer` (the prefix may be written in any case, e.g. SATFilterActions for satFilterSlice.ts).
 * @type {Rule.RuleModule}
 */
const filterSliceShapeRule = {
  meta: {
    type: "problem",
    docs: { description: "Enforce the shape of a <prefix>FilterSlice.ts." },
    messages: {
      sliceName: "The slice in {{file}} must be named '{{expected}}'.",
      reducers: "A filter slice uses the shared reducers: `reducers: filterReducer`.",
      missingExport: "{{file}} must export {{name}}.",
      missingReset:
        "A filter slice resets on ProjectActions.changeProject with resetProjectFilterState({ state, defaultFilterExpression }).",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const base = path.basename(filename);
    const sliceName = base.replace(/Slice\.ts$/, "");
    if (!sliceName.endsWith("Filter") || sliceName === "Filter") return {};
    const prefix = sliceName.slice(0, -"Filter".length);
    const expectedExports = {
      [`default${prefix}FilterExpression`.toLowerCase()]: `default<${prefix}>FilterExpression`,
      [`${prefix}FilterActions`.toLowerCase()]: `<${prefix}>FilterActions`,
      [`${prefix}FilterReducer`.toLowerCase()]: `${prefix}FilterReducer`,
    };
    const exported = new Set();
    let resets = false;

    return {
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator"(node) {
        const name = node.id.name;
        const key = name.toLowerCase();
        if (!(key in expectedExports)) return;
        // the reducer is spelled exactly like the slice, the others may write the prefix in upper case
        if (key === `${prefix}FilterReducer`.toLowerCase() && name !== `${prefix}FilterReducer`) return;
        exported.add(key);
      },
      "CallExpression[callee.name='createSlice'] > ObjectExpression"(node) {
        const property = (key) => node.properties.find((p) => p.type === "Property" && p.key.name === key);
        const name = property("name");
        if (!name || name.value.type !== "Literal" || name.value.value !== sliceName) {
          context.report({ node: name ?? node, messageId: "sliceName", data: { file: base, expected: sliceName } });
        }
        const reducers = property("reducers");
        if (!reducers || reducers.value.type !== "Identifier" || reducers.value.name !== "filterReducer") {
          context.report({ node: reducers ?? node, messageId: "reducers" });
        }
      },
      "CallExpression[callee.name='resetProjectFilterState']"() {
        resets = true;
      },
      "Program:exit"(node) {
        Object.entries(expectedExports)
          .filter(([key]) => !exported.has(key))
          .forEach(([, name]) => context.report({ node, messageId: "missingExport", data: { file: base, name } }));
        if (!resets) context.report({ node, messageId: "missingReset" });
      },
    };
  },
};

datsRulesPlugin.rules["filter-table-shape"] = filterTableShapeRule;
datsRulesPlugin.rules["filter-slice-shape"] = filterSliceShapeRule;
