# Perspectives Frontend Documentation

## Overview

The **Perspectives** module enables users to create, visualize, and analyze semantic maps of their document collections. By leveraging Large Language Models (LLMs) and dimensionality reduction techniques (UMAP), it organizes documents into clusters based on topics, sentiment, style, or other semantic instructions.

The frontend is built using React, Redux Toolkit, and React Query, with heavy reliance on **Plotly.js** for interactive visualizations.

## Dependencies & Technologies

- **[Plotly.js](https://plotly.com/javascript/)**: Used via `react-plotly.js` for the main scatter plot visualization (`MapPlot.tsx`) and diverse charts (bar, pie) in the dashboard.
- **[React Query (TanStack Query)](https://tanstack.com/query/latest)**: Manages server state, caching, and background polling for long-running jobs (via `PerspectivesHooks.ts`).
- **[Redux Toolkit](https://redux-toolkit.js.org/)**: Manages local UI state (selections, view settings, filters) via `perspectivesSlice.ts`.
- **[D3.js](https://d3js.org/)**: Used for color scales and some utility functions.

## Server Communication

Server communication is centralized in `PerspectivesHooks.ts`, which provides custom React Query hooks. These hooks handle:

- **Fetching Data**: `useGetAllAspectsList`, `useGetAspect`, `useGetDocVisualization`.
- **Mutations**: `useCreateAspect` (triggering generation), `useUpdateAspect`, `useDeleteAspect`.
- **Job Polling**: `usePollPerspectivesJob` monitors the backend job status for perspective generation (Queued -> Started -> Finished).
- **Caching**: Automatically invalidates queries (e.g., `PROJECT_ASPECTS`) upon successful mutations to keep the UI in sync.

### React Query Cache Keys

The following cache keys are used to manage state synchronization and invalidation:

- **`QueryKey.PROJECT_ASPECTS`**: Stores the list of all perspectives (Aspects) for a project. Invalidated when a new perspective is created or an existing one is deleted.
- **`QueryKey.PERSPECTIVES_JOB`**: Stores the status of a specific background job (e.g., creating a map, updating clusters). Used for polling.
- **`QueryKey.DOCUMENT_VISUALIZATION`**: Stores the heavy visualization data (coordinates, clusters) for a specific perspective.
- **`QueryKey.CLUSTER_SIMILARITIES`**: Stores the similarity matrix between clusters.
- **`QueryKey.SDOC_CLUSTES`**: Stores the cluster assignments for a specific source document.
- **`QueryKey.SDOC_ASPECT_CONTENT`**: Stores the LLM-generated content (e.g., summary/embedding text) for a specific document within a perspective.

## State Management

### Redux State (`perspectivesSlice.ts`)

The `perspectivesSlice` manages the **local** state of the user interface. Key responsibilities include:

- **Selection**: Tracking selected document IDs (`selectedSdocIds`).
- **View Settings**: Managing visualization parameters like `pointSize`, `colorBy`, `showLabels`, `xAxis`, `yAxis`.
- **Highlighting**: Controlling highlighted clusters (`highlightedClusterId`) or reviewed documents.
- **Filtering**: Managing the complex filter state (keywords, tags, metadata) specific to the perspectives view.
- **Dialogs**: Controlling the visibility of the cluster details dialog.
- **Chat**: Managing the state of the chat session associated with the perspective.

## Key Components

### 1. Overview (`Perspectives.tsx`)

This is the entry point for the module.

- **Functionality**: Displays a grid of existing perspectives (`PerspectiveCard`) and provides search/sort functionality.
- **Interactions**:
  - **Filter/Sort**: Users can search for perspectives by name and sort them by name, creation date, or size.
  - **Create**: Clicking the "Create Perspective" button opens the `PerspectiveCreationDialog`.
  - **Navigate**: Clicking a card navigates to the `PerspectiveDashboard`.
- **Server Communication**:
  - **Fetching**: `PerspectivesHooks.useGetAllAspectsList()` fetches the list of available perspectives.
- **Sub Components**: `PerspectiveCard`.

### 2. Creation Dialog (`PerspectiveCreationDialog.tsx`)

A wizard-like dialog for configuring new perspectives.

- **Functionality**: Allows users to configure the parameters for generating a new semantic map. It supports both simple templates and an "Expert Mode" for fine-tuning algorithms.
- **Interactions**:
  - **Template Selection**: Users can pick from presets like "Topic Discovery" or "Sentiment Analysis" to auto-fill prompts.
  - **Configuration**: Users specify the document type (modality), optional tags, and the core LLM instructions (embedding & modification prompts).
  - **Expert Settings**: Advanced users can toggle this to adjust UMAP (neighbors, metric, components) and HDBSCAN (min cluster size) parameters.
  - **Maximize**: The dialog can be maximized for better visibility.
- **Server Communication**:
  - **Data Manipulation**: `PerspectivesHooks.useCreateAspect()` triggers the backend job to generate the perspective.

### 3. Dashboard (`dashboard/PerspectiveDashboard.tsx`)

The landing page for a specific perspective, providing analytics and status.

- **Functionality**: Presents a high-level summary of the perspective, including generation status, document clustering stats, and previews.
- **Interactions**:
  - **View Toggle**: Users can switch between Pie and Bar charts for cluster distribution.
  - **Navigation**: "Open Map" button leads to the interactive visualization.
  - **Color Scale**: Users can adjust the color scale for similarity plots.
- **Server Communication**:
  - **Fetching**:
    - `PerspectivesHooks.useGetAspect(aspectId)`: Gets metadata.
    - `PerspectivesHooks.usePollPerspectivesJob(...)`: Polls the status of the generation job.
- **Sub Components**:
  - `DocumentClusterScatterPlot` (Preview)
  - `ClusterList`
  - `ClusterDistributionPlot`
  - `ClusterSimilarityPlot`
  - `DocAspectTable`

### 4. Interactive Map (`map/Map.tsx`)

The core visualization interface, wrapping the `MapPlot`.

- **Functionality**: A complex lay-out managing the central scatter plot, side panels for settings and info, and dialogs.
- **Interactions**: Coordinates the layout of the `SettingsPanel` (left), `MapContent` (center), and `InfoPanel` (right).
- **Server Communication**:
  - **Fetching**: Initializes the filter slice via `useInitPerspectivesFilterSlice`.
- **Sub Components**: `SettingsPanel`, `MapContent` (wraps `MapPlot`), `InfoPanel`, `ClusterJobProgressDialog`, `ClusterDetailDialog`.

### 5. Map Plot (`map/MapPlot.tsx`)

The actual scatter plot implementation.

- **Functionality**: Renders thousands of document points using WebGL. It handles the mapping of abstract high-dimensional data (reduced to 2D) to visual properties (color, position, size).
- **Interactions**:
  - **Selection**: Users can box/lasso select points to update the Redux selection state.
  - **Hover**: Displays a custom tooltip (`MapTooltip`) with document details.
  - **Panning/Zooming**: Supports standard Plotly zoom. **Crucially**, it implements a custom right-click panning mechanism to provide a better UX than the default Plotly pan tool in `select` mode.
- **Server Communication**:
  - **Fetching**: Receives the `PerspectivesVisualization` data object (fetched by parent components).

### 6. Cluster Drill-Down (`dialog/ClusterDetailDialog.tsx`)

A detailed view for a specific cluster.

- **Functionality**: Shows deep insights into a single cluster, including its generated label, description, and representative keywords/documents.
- **Interactions**:
  - **Maximize**: Can be expanded to full screen.
  - **Read**: Users browse the AI-generated description and word cloud.
  - **Recompute**: Users can trigger a re-computation of the cluster description.
- **Server Communication**:
  - **Fetching**: `PerspectivesHooks.useGetDocVisualization` (cached) provides the cluster data.
- **Sub Components**: `ClusterWordCloud`, `DocAspectTable`, `RecomputeClusterDescriptionButton`.

### 7. Job Progress Card (`components/ClusterJobProgressCard.tsx`)

A visual indicator of a background job's status.

- **Functionality**: Displays the current step, status (Queued, Started, Finished, Failed), and progress of a perspectives-related job (e.g., "Map Creation", "Refine Model").
- **Interactions**: Read-only display.
- **Sub Components**: Uses MUI `Stepper` to show progress through defined job steps.

### 8. Job Progress Dialog (`components/ClusterJobProgressDialog.tsx`)

A modal wrapper for the progress card.

- **Functionality**: Automatically appears to show the progress of an active job associated with the current perspective.
- **Interactions**: It is modal but generally non-interactive (dismissal is handled by completion or explicit close if enabled).
- **Server Communication**:
  - **Fetching**: `PerspectivesHooks.usePollPerspectivesJob` is used to check if the dialog should be open (i.e., if a job is running).
