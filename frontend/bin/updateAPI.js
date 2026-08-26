import { exec, execSync } from "child_process";
import { config } from "dotenv";
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "fs";
import { get } from "http";
import path from "path";
import process from "process";

// get env variables
config({ path: ".env" });

// settings
const openapiFilePath = "src/openapi.json";
const openapiFolderPath = "src/api";
const openapiFolders = ["core", "models", "services"];
const prettierCacheDir = "frontend/node_modules/.cache/prettier";
const barrelFilePath = `${openapiFolderPath}/index.ts`;

// ---------------------------------------------------------------------------
// Step 1: download + modify openapi.json from the running backend
// ---------------------------------------------------------------------------
function downloadOpenapi(onDone) {
  // remove existing openapi file
  if (existsSync(openapiFilePath)) {
    unlinkSync(openapiFilePath);
    console.log("Removed existing openapi.json");
  }

  // download new openapi json file
  const backendUrl = process.env.FRONTEND_API_URL;
  if (backendUrl === "" || backendUrl === undefined) {
    console.error("FRONTEND_API_URL .env variable is not set, don't know how to reach the backend!");
    process.exit(1);
  }
  get(`${backendUrl}/openapi.json`, (res) => {
    const { statusCode } = res;
    const contentType = res.headers["content-type"];

    let error;
    if (statusCode !== 200) {
      error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error(`Invalid content-type.\nExpected application/json but received ${contentType}`);
    }
    if (error) {
      console.error(error.message);
      res.resume();
      process.exit(1);
    }

    res.setEncoding("utf8");
    let rawData = "";
    res.on("data", (chunk) => {
      rawData += chunk;
    });
    res.on("end", () => {
      try {
        const openapi = JSON.parse(rawData);
        console.log("Downloaded new openapi.json");

        // modify openapi file: strip the "<tag>-" prefix from operationIds
        Object.values(openapi.paths).forEach((pathData) => {
          Object.values(pathData).forEach((operation) => {
            let tag = operation.tags[0];
            let operationId = operation.operationId;
            let toRemove = `${tag}-`;
            let newOperationId = operationId.replace(toRemove, "");
            operation.operationId = newOperationId;
          });
        });
        console.log("Modified openapi.json");

        // write file
        writeFileSync(openapiFilePath, JSON.stringify(openapi));
        console.log("Write openapi.json");

        // prettify file
        console.log("Prettify openapi.json");
        exec(`npx prettier --write ${openapiFilePath} --cache-location ${prettierCacheDir}`, (err, stdout, stderr) => {
          if (err) {
            console.error("An error occured when trying to run prettier :(");
            process.exit(1);
          }
          console.log(stdout);
          console.log(stderr);
          onDone();
        });
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
    });
  }).on("error", (e) => {
    console.error(`Got error: ${e.message}`);
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Step 2: generate the API client from openapi.json
// ---------------------------------------------------------------------------
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

function generateClient() {
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
  console.log("Updating imports in api folder...");
  processApiFolder(openapiFolderPath);
}

// ---------------------------------------------------------------------------
// Run: download openapi.json, then generate the client
// ---------------------------------------------------------------------------
downloadOpenapi(generateClient);
