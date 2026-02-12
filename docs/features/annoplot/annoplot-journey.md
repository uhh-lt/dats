# Annoplot User Journey

Date: 2026-02-12
Status: draft

## Persona

- Researcher or annotator performing QA on a project with many text annotations.
- Uses DATS monthly to validate code consistency and improve annotation guidelines.

## Journey Map

1. Discover

- Goal: find a better way to assess annotation quality.
- Action: open Project > Annotation > Annoplot.
- System response: shows scatter plot with current embeddings and count indicator.
- Pain today: only tabular views and rereading documents.
- Opportunity: make the new view discoverable from Annotation section.

2. Orient

- Goal: understand what clusters mean.
- Action: hover points, filter by code or annotator.
- System response: tooltips show snippet, code, sdoc, annotator; filters narrow points.
- Pain today: cannot compare annotators in a single view.
- Opportunity: add annotator filter and highlight.

3. Diagnose

- Goal: spot inconsistent coding.
- Action: look for mixed colors in clusters and scattered points.
- System response: clear color-coded clusters with zoom and pan.
- Pain today: no visual evidence of inconsistency.
- Opportunity: surface cluster stats (count per code).

4. Refine

- Goal: fix coding issues in bulk.
- Action: box-select points and change code.
- System response: bulk update dialog with preview and confirmation.
- Pain today: manual per-annotation edits.
- Opportunity: multi-step confirmation and undo window.

5. Refresh

- Goal: include latest annotations and rerun embeddings.
- Action: click refresh to compute missing embeddings.
- System response: progress indicator and updated count.
- Pain today: embeddings do not exist for annotations.
- Opportunity: background jobs with progress notifications.

6. Validate

- Goal: confirm improvements.
- Action: re-check cluster purity after bulk updates.
- System response: updated map with tighter clusters by code color.
- Pain today: slow feedback loop.
- Opportunity: allow snapshot comparison to previous state.
