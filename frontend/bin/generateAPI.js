const fs = require("fs");
const { execSync } = require("child_process");

// settings
const openapiFilePath = "src/openapi.json";
const openapiFolderPath = "src/api/openapi";

// 1. remove existing generated code
if (fs.existsSync(openapiFolderPath)) {
  fs.rmSync(openapiFolderPath, { recursive: true, force: true });
  console.log(`Removed existing generated code at ${openapiFolderPath}`);
}

// 2. generate code
console.log(`Generating code at ${openapiFolderPath}...`);
const openapiOutput = execSync(`openapi --input ${openapiFilePath} --useOptions --output ${openapiFolderPath}`);
console.log(openapiOutput.toString("utf-8"));

// 3. prettify file
console.log(`Prettify generated code at ${openapiFolderPath}`);
const prettierOutput = execSync(`npx prettier --write ${openapiFolderPath}`);
console.log(prettierOutput.toString("utf-8"));
