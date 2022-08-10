# D-WISE Tool Suite -- Frontend

This is the repository for the D-WISE Tool Suite (DWTS) Frontend - an outcome of
the [D-WISE Project](https://www.dwise.uni-hamburg.de/)

## Run the frontend _(for development)_
1) Install the dependencies: `npm install`
2) Generate the API Service: `npm run generate`
   - This requires the backend to be running and the OpenAPI Specification to be available at [http://localhost:5500/openapi.json](http://localhost:5500/openapi.json)
3) Run the development server: `npm run start`
4) Open the browser and visit [http://localhost:3000/](http://localhost:3000/)
