import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EMOJIBASE_VERSION = process.argv[2] ?? "17.0.0";
const LOCALE = "en";
const SOURCE_URL = `https://cdn.jsdelivr.net/npm/emojibase-data@${EMOJIBASE_VERSION}`;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetDirectory = path.resolve(scriptDirectory, "../public/assets/emojis");
const localeDirectory = path.join(assetDirectory, LOCALE);

async function download(relativePath) {
  const response = await fetch(`${SOURCE_URL}/${relativePath}`);
  if (!response.ok) {
    throw new Error(`Failed to download ${relativePath}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

await mkdir(localeDirectory, { recursive: true });

const [data, messages, license] = await Promise.all([
  download(`${LOCALE}/data.json`),
  download(`${LOCALE}/messages.json`),
  download("LICENSE"),
]);

JSON.parse(data);
JSON.parse(messages);

await Promise.all([
  writeFile(path.join(localeDirectory, "data.json"), data),
  writeFile(path.join(localeDirectory, "messages.json"), messages),
  writeFile(path.join(assetDirectory, "LICENSE"), license),
  writeFile(
    path.join(assetDirectory, "manifest.json"),
    `${JSON.stringify({ package: "emojibase-data", version: EMOJIBASE_VERSION, locale: LOCALE }, null, 2)}\n`,
  ),
]);

console.log(`Updated Emojibase assets to version ${EMOJIBASE_VERSION}.`);
