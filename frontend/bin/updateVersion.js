import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const contents = JSON.parse(readFileSync("src/openapi.json"));
const version = contents.info.version;

const packageJson = JSON.parse(readFileSync("package.json"));
packageJson.version = version;
writeFileSync("package.json", JSON.stringify(packageJson));

const packageLockJson = JSON.parse(readFileSync("package-lock.json"));
packageLockJson.version = version;
writeFileSync("package-lock.json", JSON.stringify(packageLockJson));

execSync(`npx prettier package.json --write`);
execSync(`npx prettier package-lock.json --write`);
