import path from "path";

export default {
  rules: {
    "no-alias-within-same-domain": {
      meta: {
        type: "problem",
        docs: {
          description: "Enforce relative imports when importing from the same subdomain within a global folder.",
        },
        messages: {
          useRelative:
            "Use relative imports within the same domain '{{domain}}'. Change '@{{folder}}/{{subdomain}}' to a relative path.",
        },
        schema: [],
      },
      create(context) {
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
            const srcDir = path.resolve(cwd, "src");

            // 4. Define the folders you want to check
            const globalFolders = [
              "api",
              "components",
              "core",
              "features",
              "hooks",
              "plugins",
              "routes",
              "store",
              "styles",
              "types",
              "utils",
            ];

            // Define which folders have subdomains that require subdomain-based import rules
            // const foldersWithSubdomains = ["core", "features"];

            // 5. Check each global folder
            for (const folder of globalFolders) {
              const aliasPrefix = `@${folder}/`;

              // Check if this import uses this alias
              if (!importSource.startsWith(aliasPrefix) && importSource !== `@${folder}`) continue;

              // // Only enforce this rule for folders with subdomains
              // // For folders without subdomains (like store, api), alias imports are allowed anywhere
              // if (!foldersWithSubdomains.includes(folder)) {
              //   return;
              // }

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
        docs: {
          description: "Enforce path aliases for global folders based on resolved disk paths.",
        },
        messages: {
          useAlias: "Please use the '{{alias}}' alias instead of a relative path for the global '{{folder}}' folder.",
        },
        schema: [],
      },
      create(context) {
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
            const srcDir = path.resolve(cwd, "src");

            // 5. Define the folders you want to protect
            const globalFolders = [
              "api",
              "components",
              "core",
              "features",
              "hooks",
              "plugins",
              "routes",
              "store",
              "styles",
              "types",
              "utils",
            ];

            // Define which folders have subdomains that require subdomain-based import rules
            const foldersWithSubdomains = ["api", "components", "core", "features", "plugins"];

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
        schema: [],
      },
      create(context) {
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
              if (pathParts[i].startsWith("_")) {
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
                const displayPrivateIndex = displayParts.findIndex((part) => part.startsWith("_"));

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
  },
};
