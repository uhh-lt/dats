---
applyTo: "frontend/**/*.ts, frontend/**/*.tsx"
---

## Frontend

The frontend is built using Typescript with React as the web framework.
It interacts with the backend through RESTful API endpoints.
It follows a component-based architecture, organizing UI elements into reusable components.

### Libraries and Frameworks

Dependencies are listed in package.json and managed with npm.

- React for building user interfaces
- React Router for client-side routing
- Tanstack Query for data fetching and server state management
- Redux Toolkit for global state management
- React Hook Form for form state management
- React MUI for UI components, styling, theming, and icons

### Folder Structure

- `/frontend/bin`: Various scripts
- `/frontend/public`: Public assets like logos
- `/frontend/src`: Main application code
  - `/api`: Generated API client and Hooks for API interactions
  - `/auth`: Authentication and authorization logic
  - `/components`: Reusable React components
  - `/layouts`: Layout components for different page structures
  - `/plugins`: Configurations for third-party plugins and integrations (MUI, Tanstack Query, Redux Toolkit, etc.)
  - `/router`: React Router route definitions
  - `/store`: Redux Toolkit store configuration
  - `/utils`: Utility functions and helpers
  - `/views`: Page components representing different views/screens

### File Naming Conventions

TODO

### Coding Instructions

When writing frontend code, follow these guidelines:

- Use type hints for function signatures and variable declarations.
- Write docstrings for all public functions and classes.
