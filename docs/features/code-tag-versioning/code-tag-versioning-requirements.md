# Code/Tag Versioning, Audit Log, and Annotation Outdated Warnings

Date: 2026-02-12
Status: draft

## Overview
Researchers need to track changes to user-defined codes/tags and to know whether existing annotations still align with the current code tree. This feature adds explicit versioning for user code/tag trees, an audit log for code/tag changes, and an outdated warning in the annotator when annotations were created under an older version.

## Users
- Primary: academic researchers (beginner skill level), daily usage.
- Secondary: research assistants who support code/tag maintenance.

## Problem
- Users edit codes/tags and track changes in external documents.
- During annotation review, users cannot tell whether annotations are still valid after code/tag changes.

## Goals
- Provide an in-app audit trail for user code/tag changes.
- Allow users to declare code tree versions and compare annotations against them.
- Show per-annotation outdated warnings in the annotator.

## Non-Goals
- No versioning or audit history for system codes (immutable).
- No automatic re-mapping of old annotations to new codes/tags.
- No rollback or editing of historical versions (view-only).

## Hypotheses and Validation
- Hypothesis: If code/tag changes are tracked in-app, users will stop maintaining external change logs.
- Experiment: Ship audit log + versioning to a pilot project and track usage of the audit log view.
- Success criteria: 80% of active projects stop using external change documents within 2 weeks.

## Functional Requirements
### Versioning
- Users can declare the current code tree as a named version (e.g., v1, v2).
- Each annotation stores the code tree version at creation time.
- Users can view previous versions for reference (read-only).
- Versioning applies only to user codes and user tags.

### Audit Log
- A change log is shown in the code/tag detail dialog.
- Each entry includes: actor, action type, timestamp, and old/new values.
- Actions include create, update, delete, reparent, color change, description change.

### Outdated Warnings
- An annotation is marked outdated when its stored version is older than the current active code tree version.
- Annotator view displays a per-annotation warning badge or label.
- Users can filter or sort by outdated status.

## Data Model (Proposed)
- CodeTreeVersion: id, project_id, name, created_by, created_at, is_active.
- CodeTagAuditLog: id, project_id, entity_type (code/tag), entity_id, action, old_value, new_value, actor_id, created_at.
- Annotation: add code_tree_version_id (nullable for legacy records).

## API Changes (Proposed)
- POST /code-tree-version: create a new version (mark active).
- GET /code-tree-version: list versions for project.
- GET /code-tag-audit: list audit entries for a code/tag.
- Extend annotation read DTO with code_tree_version_id and is_outdated.

## Config and Retention
- Audit retention controlled by backend config (default: forever using -1).
- Config keys in development.yaml and production.yaml.

## Security and Privacy
- Audit log visible only to users in the same project.
- Actor information limited to user display name and id.

## Success Metrics
- 80% of active projects stop external change logs within 2 weeks of release.
- 50% of annotation reviews use outdated filters within 1 month.

## Risks and Open Questions
- How to name and manage code tree versions (auto-increment vs user-defined).
- Backfilling code_tree_version_id for existing annotations.
- Performance of audit log queries for large projects.
