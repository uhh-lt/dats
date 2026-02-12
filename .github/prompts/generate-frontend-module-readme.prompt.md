---
description: Create a detailed overview in a README.md file for a specific frontend module
---

# Goal

Provide a comprehensive documentation in a structured README.md file, so that other developers can easily understand and extend functionality.

# Workflow

1. Analyze all files related to the module
2. Write the README.md according to the structure below.

# Structure

## Overview

Explain the feature with a few sentences

## Dependencies

List every dependency that is used to implement this feature

## Server Communications

List and explain all hooks that are used to communiate with the backend. Typically, these are located in frontend/src/api.
List and explain all cache keys that are used to manage the state synchronization. These always start with `QueryKey`.

## State Management

If applicable, explain the global client state (Redux slice).

## Components

This is the most important part. Explain all key components of the module.

For example:

### 1. Overview (`Perspectives.tsx`)

This is the entry point for the module.

- **Functionality**: Displays a grid of existing perspectives (`PerspectiveCard`) and provides search/sort functionality.
- **Interactions**:
  - **Filter/Sort**: Users can search for perspectives by name and sort them by name, creation date, or size.
  - **Create**: Clicking the "Create Perspective" button opens the `PerspectiveCreationDialog`.
  - **Navigate**: Clicking a card navigates to the `PerspectiveDashboard`.
- **Server Communication**:
  - **Fetching**: `PerspectivesHooks.useGetAllAspectsList()` fetches the list of available perspectives.
- **Sub Components**: `PerspectiveCard` (Visualizes a perspective as a map)

Importantly, always explain:

- Functionality: What is the purpose of this component
- Interactions: What can the user do with this component
- Server communication, split into Data Fetching and Data Manipulation (if applicable): Explain which hooks are called.
- Sub Components: List and shortly explain sub components
