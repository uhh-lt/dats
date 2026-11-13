# ADR 0006: A step run that cannot start

**Date:** 2026-11-12

When a step job cannot start because its input cannot be built, the fault is the document's: the step and the pending steps after it become erroneous on every start path, recompute included. An unreachable queue never makes steps erroneous: a feature activation stops, fails with the cause and undoes its own change for the steps it could not start (a row it created is removed, a row it reset from erroneous is erroneous again), advancing logs the failure and leaves the successor steps processing, and recompute fails the request. We chose this so that an infrastructure outage does not mark healthy documents as failed; the cost is that processing steps without a job can exist after an outage and need a restart or a recompute. This part is under discussion in issue #887 (consistent error states), which may change it.
