import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import path from "path";

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

// 5. move models folder from src/api/models to src/models
const modelsSourcePath = `${openapiFolderPath}/models`;
const modelsTargetPath = "src/models";
if (existsSync(modelsSourcePath)) {
  // Remove existing models folder at target location
  if (existsSync(modelsTargetPath)) {
    rmSync(modelsTargetPath, { recursive: true, force: true });
    console.log(`Removed existing models folder at ${modelsTargetPath}`);
  }
  renameSync(modelsSourcePath, modelsTargetPath);
  console.log(`Moved models folder from ${modelsSourcePath} to ${modelsTargetPath}`);
}

// 6. update imports in all api files from "../models/" to "@models/"
function updateImportsInFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const updatedContent = content
      .replace(/from "\.\.\/models\//g, 'from "@models/')
      .replace(/from "@api\/models\//g, 'from "@models/"');
    if (content !== updatedContent) {
      writeFileSync(filePath, updatedContent, "utf-8");
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return false;
  }
}

function processApiFolder(folderPath) {
  const files = readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      processApiFolder(filePath);
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      if (updateImportsInFile(filePath)) {
        console.log(`Updated imports in ${filePath}`);
      }
    }
  }
}

console.log("Updating imports in api folder...");
processApiFolder(openapiFolderPath);
