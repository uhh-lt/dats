# Complex Annotation Search Requirements

Date: 2026-02-12
Status: draft

## Overview

Enable researchers to find span annotations based on overlap relationships (exact match, partial overlap, within, contains) with filtering by documents and codes. Results must be fast on large corpora and easy to interpret.

## User Story

As a CultCryo researcher who annotates text weekly,
I want to search for pairs of span annotations by overlap metric,
so that I can quickly identify co-occurring or nested concepts without exporting data.

## Context

- Why needed: researchers cannot currently find overlaps in the UI and are unlikely to build custom scripts.
- Current workflow: export annotations and write custom code (rarely done).
- Pain point: overlap analysis is effectively blocked.
- Success metric: correct overlap results with fast response on large corpora.
- Timeline: ready by 2026-03-03.
- Performance target: response time under 30 seconds for large corpora.

## Scope

### In Scope

- Overlap metrics: exact match, partial overlap, within, contains.
- Filters: document IDs, code A ID, code B ID, annotator ID.
- Results visualization for matching annotations.
- Results visualization that clearly communicates the overlap metric and direction (A within B), inspired by MAXQDA.

### Out of Scope (for now)

- Cross-project search.
- Audio/video or non-text overlap logic.

## Functional Requirements

- Users can pick an overlap metric.
- Users can select one or more document IDs to search.
- Users can select code A and code B.
- Users can optionally filter by annotator ID.
- System returns matching span annotation pairs with positions.
- Results can be inspected in-context (open source document and highlight spans).

## Overlap Definitions (Span A: [a_start, a_end), Span B: [b_start, b_end))

- Exact match: a_start == b_start AND a_end == b_end
- Partial overlap: a_start < b_end AND b_start < a_end AND NOT exact match AND NOT within/contains
- Within: a_start >= b_start AND a_end <= b_end AND NOT exact match
- Contains: a_start <= b_start AND a_end >= b_end AND NOT exact match

## Non-Functional Requirements

- Performance: response time under 30 seconds for large corpora.
- Correctness: overlap logic must be consistent with half-open intervals.
- Usability: filters must be discoverable and require no scripting.
- Clarity: UI must visually communicate the overlap metric and A/B direction.

## Hypothesis-Driven Development

- Hypothesis: If overlap search is available in the UI, researchers will complete overlap analyses without exporting data.
- Experiment: release to CultCryo users, track overlap searches per week and time-to-result.
- Success Criteria: 80% of overlap analysis tasks completed inside DATS within 4 weeks.
- Learning Integration: refine overlap filters and default views based on usage patterns.
- Iteration Plan: add advanced filters (tag, time range) if adoption is high.

## Open Questions

- Should results group by document or by code pair?
- Any preferred visual reference beyond MAXQDA for overlap display?
