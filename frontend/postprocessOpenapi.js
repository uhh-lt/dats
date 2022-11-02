const fs = require("fs");
const path = "src/openapi.json";

// read openapi file
let openapi = JSON.parse(fs.readFileSync(path));

Object.values(openapi.paths).forEach((pathData) => {
  Object.values(pathData).forEach((operation) => {
    let tag = operation.tags[0];
    let operationId = operation.operationId;
    let toRemove = `${tag}-`;
    let newOperationId = operationId.replace(toRemove, "");
    operation.operationId = newOperationId;
  });
});

console.log(openapi.paths);

// write openapi file
fs.writeFileSync(path, JSON.stringify(openapi));
