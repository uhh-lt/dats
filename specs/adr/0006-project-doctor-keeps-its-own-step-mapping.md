# ADR 0006: The project doctor keeps its own step mapping

**Date:** 2026-11-12

`tools/project_doctor` does not import the pipeline registry; it keeps one copy of the step-to-store mapping and the status integers in `doctor_stores.py`. The doctor has to run on the released image that production uses, where the backend is not on its path, so a test (`test_project_doctor_steps.py`) keeps the copy equal to the pipeline instead.
