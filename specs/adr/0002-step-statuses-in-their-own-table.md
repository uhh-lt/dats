# ADR 0002: Step statuses live in their own table and the document status is derived

**Date:** 2026-11-12

Each pipeline step of a source document has one row in `sourcedocumentstepstatus` (no row means not planned), instead of one column per step on the document. The document status and the feature status are computed from these rows by query and are never stored. We chose this so that a new pipeline step needs no migration and no second place to update; the cost is a join or an `EXISTS` for every status filter, which we measured as roughly even on 300,000 documents.
