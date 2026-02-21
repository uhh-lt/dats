export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Find all import declarations
  root.find(j.ImportDeclaration).forEach((path) => {
    const sourceValue = path.node.source.value;

    // OPTION A: Only process relative imports (./ or ../)
    // This ignores libraries like 'react', '@mui/material', etc.
    if (typeof sourceValue === "string" && sourceValue.startsWith(".")) {
      const specifiers = path.node.specifiers;

      // Look for the default import specifier: import Name from '...'
      const defaultSpecifierIndex = specifiers.findIndex((s) => s.type === "ImportDefaultSpecifier");

      if (defaultSpecifierIndex !== -1) {
        const defaultSpecifier = specifiers[defaultSpecifierIndex];
        const localName = defaultSpecifier.local.name;

        // Create a named specifier: { Name }
        const namedSpecifier = j.importSpecifier(j.identifier(localName));

        // Replace the default specifier with the named one in the array
        specifiers[defaultSpecifierIndex] = namedSpecifier;
      }
    }
  });

  return root.toSource({ quote: "single", trailingComma: true });
}
