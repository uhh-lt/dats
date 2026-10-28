# Project Doctor

DATS keeps a project in four data stores: Postgres (documents, annotations, codes, tags, ...), the filesystem (the uploaded files and their thumbnails), Elasticsearch (the full-text index) and Weaviate (the embeddings). A crash, a failed job or a manual intervention can leave them out of sync, for example a document whose file is gone. Such a document breaks the project export:

```
SourceDocumentNotFoundInFilesystemError: The original file of SourceDocument 6471 (031 Der Koenig von Narnia.mp3) cannot be found in the DATS Filesystem at /dats/docker/backend_repo/projects/27/docs/031 Der Koenig von Narnia.mp3
```

The project doctor (`tools/project_doctor`) finds these inconsistencies and heals them, in two steps:

1. `check` reads all stores, prints the issues and writes them to a JSON report. It changes nothing.
2. `heal` takes the report and applies the fix of each issue. Without `--apply` it only shows what it would do.

## Usage

Run the doctor on the host of the deployment, from the checkout whose `docker/` folder runs DATS. The wrapper script starts a one-off container of the backend image with the same environment and volumes as the API (like the scripts in `bin/prod`), so it reaches all stores with the instance's own configuration:

```bash
# 1) check one project (or omit --project to check all projects and the leftovers of deleted ones)
tools/project_doctor/dats-doctor.sh check --project 27 -o report.json

# 2) review report.json: delete the issues that heal must not touch

# 3) see what heal would do, then do it
tools/project_doctor/dats-doctor.sh heal report.json
tools/project_doctor/dats-doctor.sh heal report.json --apply

# 4) verify
tools/project_doctor/dats-doctor.sh check --project 27
```

`heal --only <check>` limits heal to the issues of one check (repeatable). `check --all` prints every issue instead of 20 per check, `-v` shows the DATS logs.

In development, `just doctor check|heal ...` runs the doctor against the dev stack of the checkout (`backend/.env`).

!!! warning
Stop uploads and processing in the affected projects while you heal them. `check` skips files younger than `--min-file-age` minutes (default 60), as they may still be processed.

## Checks

| Check                      | Finds                                                                                  | Heal                                       |
| -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------ |
| `missing_original_file`    | Documents whose uploaded file is missing (breaks the export)                           | Deletes the document from all stores       |
| `missing_thumbnail`        | Images whose `.webp` or thumbnail is missing                                           | Recomputes the thumbnail                   |
| `orphaned_file`            | Files in a project's `docs/` folder that belong to no document                         | Moves the file to the quarantine folder    |
| `orphaned_project_dir`     | Project folders of deleted projects                                                    | Moves the folder to the quarantine folder  |
| `missing_sdoc_data`        | Documents without processed data (content, sentences), with no step still running      | None: retry the processing or delete them  |
| `failed_processing`        | Documents with failed processing steps                                                 | None: retry in the document health view    |
| `cross_project_reference`  | Annotations, folders, tags or metadata that reference another project                  | None: inspect them in the database         |
| `annotation_out_of_bounds` | Annotations beyond the text of their document, bounding boxes with invalid coordinates | Deletes the annotations                    |
| `missing_es_document`      | Indexed documents missing in the project's Elasticsearch index (breaks the search)     | Indexes them again                         |
| `orphaned_es_document`     | Elasticsearch documents of deleted documents                                           | Deletes them                               |
| `orphaned_es_index`        | Elasticsearch indices of deleted projects                                              | Deletes them                               |
| `missing_embeddings`       | Documents without sentence or image embeddings, although the embedding step finished   | Recomputes the embeddings (needs a worker) |
| `orphaned_embeddings`      | Weaviate embeddings of deleted documents                                               | Deletes them                               |
| `orphaned_weaviate_tenant` | Weaviate tenants of deleted projects                                                   | Deletes them                               |

If the file of a document is missing, but a file exists whose name differs only in case or unicode normalization, the doctor proposes to rename that file instead of deleting the document.

## How heal stays safe

- **The report is the approval.** Heal only touches issues that are in the report. Delete an issue from the report to keep it as it is.
- **Fresh state.** Heal checks again before it applies anything and takes the fixes from the fresh check. Issues that were resolved in the meantime are skipped, and the ids it acts on are current.
- **Documents first.** Heal deletes documents first, then checks again and applies the remaining fixes, so they do not act on deleted documents.
- **Same code paths.** Heal deletes documents and annotations through the DATS services, which clean up all stores (annotations, memos, files, Elasticsearch, Weaviate).
- **Quarantine instead of delete.** Files and folders are moved to `<filesystem root>/quarantine/<timestamp>/`, from where you restore them or delete them by hand.
- **One transaction per fix.** A failing fix does not roll back the others; heal reports it and continues.
