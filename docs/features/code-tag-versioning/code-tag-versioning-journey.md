# User Journey Map: Code/Tag Versioning and Outdated Warnings

Date: 2026-02-12
Status: draft

## Persona
- Academic researcher, beginner with technical tools, daily usage.

## Scenario
User updates the code tree during analysis and later reviews annotations, needing confidence that annotations align with the latest code/tag structure.

## Journey Steps
1. Edit codes/tags (rename, reparent, update description).
2. Declare a new code tree version (e.g., v2).
3. Continue annotating documents under the active version.
4. Open annotator to review existing annotations.
5. See outdated indicators on annotations created under older versions.
6. Open code/tag detail dialog and review the audit log.

## Pain Points (Current)
- Manual tracking of changes in external documents.
- Uncertainty about whether older annotations still match current codes/tags.
- No visibility into who changed what and when.

## Desired Outcomes
- In-app audit trail with clear change history.
- Confidence that outdated annotations are flagged.
- Ability to view historical versions for reference.

## Touchpoints
- Code/tag detail dialog (audit log).
- Code tree management view (version declaration).
- Annotator panel (outdated warnings and filters).

## Opportunities
- Guided prompts to create a new version after significant edits.
- Bulk review workflow for outdated annotations.
- Export audit log for project documentation.
