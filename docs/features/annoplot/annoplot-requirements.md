# Annoplot Requirements

Date: 2026-02-12
Status: draft

## Overview

Annoplot is a new annotation-focused 2D map that visualizes each text annotation as a point in an embedding scatter plot, colored by code color. It helps researchers assess annotation quality and consistency, and enables bulk refinement directly from the map.

## User Story

As a qualitative researcher working on the Cult Cryo and Climate Change project,
I want to visualize all annotations on a 2D map and edit them in bulk,
So that I can quickly assess consistency and refine codes without rereading documents.

## Context

- Why is this needed? QA for annotation quality is currently manual and slow.
- Current workflow: users scan tabular annotation lists and reread documents to judge consistency.
- Pain point: no visual cluster cue, no easy way to compare annotators or bulk adjust codes.
- Success metric: users use the view to refine annotations and report improved clarity; see Success Criteria below.
- Reference: reuse concepts from Perspectives (dimensionality reduction and scatter visualization).

## Hypothesis-Driven Development

- Hypothesis: a 2D embedding map makes code consistency visible and accelerates QA decisions.
- Experiment: add Annoplot view with a refreshable embedding pipeline and bulk code update actions.
- Success criteria: see measurable targets below; collect feedback in pilot projects.
- Learning integration: refine embedding strategy, filters, and interactions based on usage.
- Iteration: expand to annotator comparisons and non-text annotations after baseline adoption.

## Scope

- In scope: span and sentence annotations for text documents, scatter plot colored by code, selection box for bulk updates, refreshable embeddings.
- Out of scope (v1): bbox/image annotations, audio/video annotations, advanced lasso selection, automatic cluster labeling.

## Functional Requirements

- New view: Project > Annotation > Annoplot.
- Each point represents one annotation (span or sentence) with:
  - Color = code color.
  - Tooltip on hover with snippet, code name, sdoc title, annotator.
- Selection and bulk actions:
  - Box selection of multiple points.
  - Bulk change code for selected annotations.
  - Bulk delete option with confirmation.
- Filtering:
  - Filter by code, annotator, and source document.
- Embedding refresh:
  - UI shows visible count, e.g., "Showing 45/70 annotations".
  - Refresh button computes missing embeddings and updates map to full count.
  - Refresh runs asynchronously and shows progress.
- Persistence:
  - Embeddings stored and reused; refresh only computes missing or stale ones.

## Non-Functional Requirements

- Performance: initial view renders within 3 seconds for 1,000 annotations; refresh completes within 60 seconds for 1,000 items.
- Accessibility: keyboard navigation for selection and bulk actions.
- Reliability: refresh failures surface actionable errors without data loss.

## Technical Requirements

- Frontend: reuse Perspectives scatter/UMAP visualization patterns.
- Backend: embedding computation and storage for annotations, and retrieval endpoints.
- Data stores: vector storage in Weaviate or existing embedding storage patterns.
- Security: project-based authorization via existing AuthzUser checks.

## Success Criteria

- At least one pilot project uses Annoplot monthly for QA.
- Users report that they can identify inconsistent coding patterns without rereading full documents.
- Users successfully perform bulk code changes in Annoplot.

## Risks and Open Questions

- Embedding strategy: when to compute embeddings and which model to use for annotation text.
- Staleness: when annotations change, how to mark embeddings as stale.
- Compare annotators: how to represent multiple annotators in one map.

## Definition of Done

- Annoplot view shipped and documented.
- Embeddings computed and stored for annotations.
- Bulk actions implemented with confirmation and audit trail.
- QA feedback from at least one project recorded.
