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
const websocketEventsFilePath = "src/models/websocketEvents.ts";

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
// Step 3: generate src/models/websocketEvents.ts from the openapi `webhooks`
// section. The backend registers every websocket sync event as a webhook whose
// RESPONSE (response_model) is the event envelope ({ type, payload }) — declared
// as a response, not a request body, so payload DTOs serialize in output mode
// (e.g. UserRead-Output, which omits the password field). We turn that into a
// discriminated union + a WebSocketEventMap so the frontend's event contract is
// generated from the backend (single source of truth) instead of hand-written.
// ---------------------------------------------------------------------------
function resolveRefName(ref) {
  // "#/components/schemas/TagCreatedEvent" -> "TagCreatedEvent"
  return ref.split("/").pop();
}

function generateWebsocketEvents() {
  const openapi = JSON.parse(readFileSync(openapiFilePath, "utf-8"));
  const webhooks = openapi.webhooks;
  if (!webhooks) {
    console.warn("No `webhooks` section in openapi.json — skipping websocketEvents.ts generation.");
    return;
  }

  // Collect one entry per event: { eventType, eventName }.
  const events = [];
  for (const [eventType, operation] of Object.entries(webhooks)) {
    const post = operation.post;
    if (!post) continue;
    // The event envelope is the webhook's 200-response schema (response_model).
    const eventRef = post.responses?.["200"]?.content?.["application/json"]?.schema?.$ref;
    if (!eventRef) continue;
    events.push({ eventType, eventName: resolveRefName(eventRef) });
  }

  // Deterministic output.
  events.sort((a, b) => a.eventType.localeCompare(b.eventType));

  // The generator already emits one model per event (e.g. TagCreatedEvent.ts)
  // because the event classes live in components/schemas. We reuse those models
  // and only add the two things the generator does NOT produce: the
  // event-type-string -> payload map, and a discriminated union keyed by `type`.
  const lines = [];
  lines.push("/* eslint-disable */");
  lines.push("// GENERATED FILE — do not edit. Regenerate with `just update-api`.");
  lines.push("// Derived from the backend's websocket sync events (OpenAPI `webhooks`).");
  lines.push("");
  for (const e of events) {
    lines.push(`import type { ${e.eventName} } from "./${e.eventName}";`);
  }
  lines.push("");
  lines.push("/** Payload type for each websocket event type. */");
  lines.push("export interface WebSocketEventMap {");
  for (const e of events) {
    lines.push(`  ${e.eventType}: ${e.eventName}["payload"];`);
  }
  lines.push("}");
  lines.push("");
  lines.push("/** Discriminated union of all websocket events, keyed by `type`. */");
  lines.push("export type WebSocketEvent =");
  events.forEach((e, i) => {
    const sep = i === events.length - 1 ? ";" : "";
    lines.push(`  | (Omit<${e.eventName}, "type"> & { type: "${e.eventType}" })${sep}`);
  });
  lines.push("");

  writeFileSync(websocketEventsFilePath, lines.join("\n"));
  console.log(`Wrote ${events.length} websocket events to ${websocketEventsFilePath}`);

  execSync(`npx prettier --write ${websocketEventsFilePath} --cache-location ${prettierCacheDir}`);
}

// ---------------------------------------------------------------------------
// Run: download openapi.json, then generate the client + websocket events
// ---------------------------------------------------------------------------
downloadOpenapi(() => {
  generateClient();
  generateWebsocketEvents();
});
