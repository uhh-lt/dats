const fs = require("fs");
const { execSync } = require("child_process");

const contents = JSON.parse(fs.readFileSync("src/openapi.json"));
const version = contents.info.version;

const packageJson = JSON.parse(fs.readFileSync("package.json"));
packageJson.version = version;
fs.writeFileSync("package.json", JSON.stringify(packageJson));

execSync(`npx prettier --write package.json`);
