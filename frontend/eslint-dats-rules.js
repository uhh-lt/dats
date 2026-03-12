import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Slice-map helpers for no-cross-slice-access
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

export default {
  rules: {
    "no-alias-within-same-domain": {
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
    },
    "enforce-global-aliases": {
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
              if (
                resolvedImportPath === globalFolderPath ||
                resolvedImportPath.startsWith(globalFolderPath + path.sep)
              ) {
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
    },
    "no-private-folder-scope-violation": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Enforce that private folders (prefixed with _) can only be accessed from within their own scope.",
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
    },
    "no-internal-modules-public-entry": {
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
    },
    "no-cross-slice-access": {
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
    },
    "no-scope-violations": {
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
    },
  },
};
