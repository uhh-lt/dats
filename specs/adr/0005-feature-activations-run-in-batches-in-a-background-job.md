# ADR 0005: Feature activations are planned in batches in a background job

**Date:** 2026-11-12

Enabling or completing a feature only records a pending feature activation on the project and enqueues a job inside the request's transaction; the job plans and starts the steps in batches with one commit per batch. The pending activation is stored on the project rather than read from the job system, because the feature status must be cheap to read and must not depend on Redis. The job may be enqueued before the commit because its first statement waits for the project lock the request still holds; if a worker dies mid-job, RQ's failure callback removes the pending activation once RQ notices the dead worker (ADR 0006), and the feature reads partly available.
