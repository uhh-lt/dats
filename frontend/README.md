# D-WISE Tool Suite -- Frontend

This is the repository for the D-WISE Tool Suite (DWTS) Frontend - an outcome of
the [D-WISE Project](https://www.dwise.uni-hamburg.de/)

## Run the frontend _(for development)_

1. Install the dependencies: `npm install -f`
2. Download openapi.json from backend: `npm run update-api`
   - This requires the backend to be running and the OpenAPI Specification to be available at [http://localhost:5500/openapi.json](http://localhost:5500/openapi.json)
3. Generate the API Service: `npm run generate-api`
4. Run the development server: `npm run start`
5. Open the browser and visit [http://localhost:3000/](http://localhost:3000/)

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
