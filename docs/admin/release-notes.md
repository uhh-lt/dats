# Release Notes

Notes for administrators on what to expect when upgrading a DATS instance.

## Project Features

This release adds [project features](../feature-guides/project-features.md): every project chooses which features DATS computes for its documents.

- **Database migration**: the backend migrates the database on its first start. The migration moves the processing status of every document from the `sourcedocument` table into the new table `sourcedocumentstepstatus` and holds an exclusive lock on `sourcedocument`; it took about 13 seconds for 300,000 documents on a development machine. Plan the start accordingly, and make sure no health check restarts the backend while it migrates. The migration checks that no document changes its processing status and aborts the start (rolling back) otherwise.
- **All features stay enabled**: every existing project enables all features after the migration, so nothing is recomputed and nothing disappears.
- **Tag Recommendations shows "partly available"**: before this release, document embeddings were computed on demand. After the migration, every existing project shows **Tag Recommendations** as partly available in **Project Settings** → **Features** until a project member clicks **Complete**, which computes the missing document embeddings in the background.
