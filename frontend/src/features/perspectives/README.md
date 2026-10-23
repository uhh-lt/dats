# Perspectives Frontend Documentation

## Overview

The **Perspectives** feature lets users create, visualize and analyze semantic maps of their document collections. Using Large Language Models (LLMs) and dimensionality reduction (UMAP), it groups documents into clusters by topic, sentiment, style or any other instruction. The clustering pipeline itself is described in `.github/instructions/perspectives.instructions.md`.

The feature follows the frontend conventions (`.github/instructions/frontend-*.instructions.md`) and relies on **Plotly.js** for its interactive visualizations.

## Dependencies & Technologies

- **[Plotly.js](https://plotly.com/javascript/)**: via `react-plotly.js` for the map scatter plot (`MapPlot.tsx`) and the charts of a perspective (bar, pie, similarity).
- **[TanStack Query](https://tanstack.com/query/latest)**: server state, through the query factory `api/perspectivesQueries.ts` and the hooks object `api/perspectivesHooks.ts`.
- **[Redux Toolkit](https://redux-toolkit.js.org/)**: UI state (selection, view settings, map filter, chat) in `store/perspectivesSlice.ts`.
- **[D3.js](https://d3js.org/)**: color scales and small utilities.

## Folder Structure

- `api/`: `perspectivesQueries.ts` (query factory) and `perspectivesHooks.ts` (`PerspectivesHooks`).
- `store/perspectivesSlice.ts`: the Redux slice.
- `views/dashboard/`: the list of perspectives (`PerspectivesDashboardView`) with `PerspectiveCard` and `PerspectiveCreationDialog`.
- `views/detail/`: one perspective (`PerspectiveView`) with its plots and cluster list.
- `views/map/`: the interactive map (`PerspectivesMapView`) with toolbar, settings panel and info panel.
- `_components/`: used by several views: `DocAspectTable`, the job progress card, and the cluster detail dialog (`dialog/`).

## Server Communication

All queries are defined once in `perspectivesQueries` (root key `"perspectives"`):

| Leaf                                           | Data                                                       |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `aspectsByProject(projectId)`                  | all perspectives (aspects) of a project, as a map by id    |
| `docAspect(aspectId, sdocId)`                  | the LLM-generated content of one document in a perspective |
| `visualization(aspectId, searchQuery, filter)` | the map data: coordinates, clusters, document assignments  |
| `clusterSimilarities(aspectId)`                | the similarity matrix between the clusters                 |
| `clustersBySdoc(aspectId, sdocId)`             | the clusters of one document                               |
| `job.byId(jobId)`                              | a perspectives background job                              |

`PerspectivesHooks` holds the hooks that add something on top of the factory: `useGetAspect`, `useGetDocVisualization`, the mutations `useCreateAspect`, `useUpdateAspect`, `useDeleteAspect`, `useStartPerspectivesJob`, `useUpdateClusterDetails`, `useLabelDocs`, `useUnlabelDocs`, and `useRAGChat`.

The routes under `routes/_auth/project/$projectId/perspectives/` load `aspectsByProject` in their `context`/`loader`; the views read it with `useSuspenseQuery` from the route context. The `$aspectId` routes throw `notFound()` for an unknown aspect. Running jobs are followed with `useLiveJob(perspectivesQueries.job.byId(jobId))`.

## State Management

### Redux State (`perspectivesSlice.ts`)

The slice holds the UI state of the feature:

- **Selection**: the selected document ids (`selectedSdocIds`) and the position in that selection.
- **View settings**: `colorBy`, color scheme, `pointSize`, `showLabels`, axes, ticks and grid.
- **Highlighting**: the highlighted cluster (`highlightedClusterId`) and whether reviewed documents are highlighted.
- **Filtering**: the map filter; the slice builds on the generic `filterReducer` (see `frontend-filter.instructions.md`), plus the search query and the pinned statistics.
- **Chat**: the model, session and messages of the analysis assistant.

The cluster detail dialog is opened through the global dialog bus (`useOpenDialog("clusterDetail")`), not through this slice.

## Key Components

### 1. Dashboard (`views/dashboard/PerspectivesDashboardView.tsx`)

The entry point: a grid of the project's perspectives (`PerspectiveCard`) with search and sorting by name, creation date or size. The "Create Perspective" button opens the `PerspectiveCreationDialog`; a card navigates to the perspective.

### 2. Creation Dialog (`views/dashboard/_components/PerspectiveCreationDialog.tsx`)

A dialog for configuring a new perspective; it renders its own trigger button.

- **Templates**: presets like "Topic Discovery" or "Sentiment Analysis" fill in the prompts.
- **Configuration**: document type (modality), optional tags, and the LLM instructions (embedding and modification prompts).
- **Expert settings**: UMAP (neighbors, metric, components) and HDBSCAN (min cluster size) parameters.
- **Server**: `PerspectivesHooks.useCreateAspect()` starts the backend job; the dialog closes on success.

### 3. Perspective (`views/detail/PerspectiveView.tsx`)

The overview of one perspective: generation status, clustering statistics and previews.

- **Interactions**: switch between pie and bar chart for the cluster distribution, open the map, adjust the color scale of the similarity plot.
- **Sub components**: `DocumentClusterScatterPlot` (preview), `ClusterList`, `ClusterDistributionPlot`, `ClusterSimilarityPlot`, `DocAspectTable`.

### 4. Interactive Map (`views/map/PerspectivesMapView.tsx`)

The layout around the scatter plot: `SettingsPanel` (left), `MapContent` with `MapPlot` (center), `InfoPanel` (right), the `MapToolbar`, and the cluster detail dialog. While the aspect's most recent job has not finished, the view shows its `ClusterJobProgressCard` instead of the map. The filter dialog in the toolbar loads the column infos with `TableInfoHooks.useColumnInfoMap(sdocQueries.tableInfo(projectId))`.

### 5. Map Plot (`views/map/_components/MapPlot.tsx`)

The WebGL scatter plot of the documents.

- **Selection**: box/lasso selection updates the Redux selection.
- **Hover**: a custom tooltip (`MapTooltip`) with document details.
- **Panning/zooming**: standard Plotly zoom plus a custom right-click panning, which works better than Plotly's pan tool in `select` mode.
- **Data**: receives the visualization data from its parents.

### 6. Cluster Detail Dialog (`_components/dialog/ClusterDetailDialog.tsx`)

Details of one cluster: its generated label and description, keywords (`ClusterWordCloud`) and documents (`DocAspectTable`). Users can edit the details or recompute the description (`RecomputeClusterDescriptionButton`). It is opened from `ClusterList` and `ColorSettings` through the dialog bus.

### 7. Job Progress (`_components/ClusterJobProgressCard.tsx`)

The card shows the steps and status (queued, started, finished, failed) of a perspectives job with an MUI `Stepper`. The perspective view and the map view show it while the aspect's most recent job is running (`useLiveJob`).
