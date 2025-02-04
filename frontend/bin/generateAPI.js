import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";

// settings
const openapiFilePath = "src/openapi.json";
const openapiFolderPath = "src/api/openapi";
const prettierCacheDir = "frontend/node_modules/.cache/prettier";
const barrelFilePath = `${openapiFolderPath}/index.ts`;

// 1. remove existing generated code
if (existsSync(openapiFolderPath)) {
  rmSync(openapiFolderPath, { recursive: true, force: true });
  console.log(`Removed existing generated code at ${openapiFolderPath}`);
}

// 2. generate code
console.log(`Generating code at ${openapiFolderPath}...`);
const openapiOutput = execSync(`openapi --input ${openapiFilePath} --useOptions --output ${openapiFolderPath}`);
console.log(openapiOutput.toString("utf-8"));

// 3. delete barrel file
if (existsSync(barrelFilePath)) {
  rmSync(barrelFilePath, { force: true });
  console.log(`Removed barrel file at ${barrelFilePath}`);
}

// 4. prettify files
console.log(`Prettify generated code at ${openapiFolderPath}`);
const prettierOutput = execSync(`npx prettier --write ${openapiFolderPath} --cache-location ${prettierCacheDir}`);
console.log(prettierOutput.toString("utf-8"));
