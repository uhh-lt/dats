import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const contents = JSON.parse(readFileSync("src/openapi.json"));
const version = contents.info.version;

const packageJson = JSON.parse(readFileSync("package.json"));
packageJson.version = version;
writeFileSync("package.json", JSON.stringify(packageJson));

execSync(`npx prettier --write package.json`);
