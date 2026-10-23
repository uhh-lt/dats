---
name: generate-frontend-module-readme
description: Create a detailed overview in a README.md file for a specific frontend module
disable-model-invocation: true
---

# Goal

Provide a comprehensive documentation in a structured README.md file, so that other developers can easily understand and extend functionality.

# Workflow

1. Analyze all files of the module (`frontend/src/features/<name>/` or `frontend/src/core/<domain>/`), the routes that render its views (`frontend/src/routes/`) and the frontend instructions it follows (`.github/instructions/frontend-*.instructions.md`).
2. Write the README.md into the module's root folder according to the structure below. Describe the code as it is: every file, leaf and hook you name must exist.

# Structure

## Overview

Explain the feature with a few sentences

## Dependencies

List every dependency that is used to implement this feature

## Folder Structure

List the module's folders (`api/`, `store/`, `views/<name>/`, `_components/`, ...) and what each one holds (see `frontend-feature.instructions.md`).

## Server Communication

The module's server data is defined in its query factory `api/<x>Queries.ts` and its hooks object `api/<x>Hooks.ts` (see `frontend-api.instructions.md`). The generated client in `frontend/src/api` is only called from there.

- Name the factory's root key and list its leaves in a table (leaf with arguments, the data it returns), as in the factory's doc comment.
- List the hooks of the hooks object (`XHooks.useX`) and what each adds on top of the factory (`select`, mutations, cache updates).
- Explain which queries the routes load in their `context`/`loader` (the views read them with `useSuspenseQuery` from the route context) and which the components start themselves.
- Mention the data the module uses from other domains (`TagHooks`, `sdocQueries`, ...).

## State Management

If applicable, explain the global client state (Redux slice).

## Components

This is the most important part. Explain all key components of the module.

For example:

### 1. Dashboard (`views/dashboard/PerspectivesDashboardView.tsx`)

This is the entry point for the module.

- **Functionality**: Displays a grid of existing perspectives (`PerspectiveCard`) and provides search/sort functionality.
- **Interactions**:
  - **Filter/Sort**: Users can search for perspectives by name and sort them by name, creation date, or size.
  - **Create**: Clicking the "Create Perspective" button opens the `PerspectiveCreationDialog`.
  - **Navigate**: Clicking a card navigates to the `PerspectiveView`.
- **Server Communication**:
  - **Fetching**: the route loads `perspectivesQueries.aspectsByProject(projectId)`; the view reads it with `useSuspenseQuery` from the route context.
- **Sub Components**: `PerspectiveCard` (Visualizes a perspective as a map)

Importantly, always explain:

- Functionality: What is the purpose of this component
- Interactions: What can the user do with this component
- Server communication, split into Data Fetching and Data Manipulation (if applicable): Explain which factory leaves and hooks are used, and whether the data comes from the route.
- Sub Components: List and shortly explain sub components
