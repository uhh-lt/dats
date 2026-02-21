export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // 1. Find the Export Default Declaration
  root.find(j.ExportDefaultDeclaration).forEach((path) => {
    const declaration = path.node.declaration;

    // CASE A: export default memo(ComponentName)
    if (
      declaration.type === "CallExpression" &&
      declaration.callee.name === "memo" &&
      declaration.arguments[0].type === "Identifier"
    ) {
      const componentName = declaration.arguments[0].name;

      // Find the original function definition for this component
      root.find(j.FunctionDeclaration, { id: { name: componentName } }).forEach((funcPath) => {
        const { id, params, body } = funcPath.node;

        // Convert to: export const ComponentName = memo((props) => { ... })
        const arrowFunction = j.arrowFunctionExpression(params, body);
        const memoCall = j.callExpression(j.identifier("memo"), [arrowFunction]);
        const variableDeclaration = j.exportNamedDeclaration(
          j.variableDeclaration("const", [j.variableDeclarator(id, memoCall)]),
        );

        j(funcPath).replaceWith(variableDeclaration);
      });

      // Remove the "export default memo(...)" line
      j(path).remove();
    }

    // CASE B: export default ComponentName (Standard)
    else if (declaration.type === "Identifier") {
      const componentName = declaration.name;

      // Find the function and add 'export' to it
      root.find(j.FunctionDeclaration, { id: { name: componentName } }).forEach((funcPath) => {
        j(funcPath).replaceWith(j.exportNamedDeclaration(funcPath.node));
      });

      // Remove the "export default ..." line
      j(path).remove();
    }
  });

  return root.toSource();
}
