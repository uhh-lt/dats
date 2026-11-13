# ADR 0007: The feature system owns the project feature actions

**Date:** 2026-11-13

The endpoints that read the features of a project and enable, complete and disable them, their DTOs, the status of a feature and the rule which action a status allows live in `systems/feature_system`, like the job endpoints live in the job system; the planning they trigger stays in `StepPlanningService` (`modules/doc_processing`). Before, they lived in `modules/project_features`, which imported `modules/doc_processing`, while the step planning imported the status back from it. The feature system now imports `modules/doc_processing` directly, under a narrow exemption of the layering lint (`lint/check_core.py`: three files, one package). We rejected an interface or a registration hook that would hide the dependency: the exemption is temporary, as document processing is to move to `core` (uhh-lt/dats#900, "Move document processing to core"), which makes these imports legal and removes it.
