# ADR 0003: Step planning owns every planning write

**Date:** 2026-11-12

**Status:** superseded in part by [ADR 0008](0008-the-artefact-system-owns-planning-and-availability.md)

Only the step planning service (`StepPlanningService`) takes the project lock and the document locks for planning and writes planning rows, pending feature activations and `project.enabled_features`; its SQL is private to it and is not offered by the CRUDs. A writer outside it would break the lock order (project, then documents ascending) without any test failing, which is why enabling, completing, disabling, the import and the upload all go through it. We rejected public CRUD methods fenced by a lint rule: a private statement needs no rule to be understood.
