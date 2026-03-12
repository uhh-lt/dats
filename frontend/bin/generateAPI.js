import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";

// settings
const openapiFilePath = "src/openapi.json";
const openapiFolderPath = "src/api";
const openapiFolders = ["core", "models", "services"];
const prettierCacheDir = "frontend/node_modules/.cache/prettier";
const barrelFilePath = `${openapiFolderPath}/index.ts`;

// 1. remove existing generated folders (core, models, services)
for (const folder of openapiFolders) {
  const folderPath = `${openapiFolderPath}/${folder}`;
  if (existsSync(folderPath)) {
    rmSync(folderPath, { recursive: true, force: true });
    console.log(`Removed existing generated code at ${folderPath}`);
  }
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
for (const folder of openapiFolders) {
  const folderPath = `${openapiFolderPath}/${folder}`;
  console.log(`Prettify generated code at ${folderPath}`);
  const prettierOutput = execSync(`npx prettier --write ${folderPath} --cache-location ${prettierCacheDir}`);
  console.log(prettierOutput.toString("utf-8"));
}
