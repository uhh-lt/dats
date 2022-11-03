const fs = require("fs");

// read openapi file
let openapi = JSON.parse(fs.readFileSync(0));

Object.values(openapi.paths).forEach((pathData) => {
  Object.values(pathData).forEach((operation) => {
    let tag = operation.tags[0];
    let operationId = operation.operationId;
    let toRemove = `${tag}-`;
    let newOperationId = operationId.replace(toRemove, "");
    operation.operationId = newOperationId;
  });
});

fs.writeSync(process.stdout.fd, JSON.stringify(openapi));