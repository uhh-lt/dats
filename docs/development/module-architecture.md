# Module Architecture

The DATS backend is built from a small core, three systems and self-contained modules. This page gives the whole picture for a developer who adds or changes a capability. The terms are defined in [`GLOSSARY.md`](https://github.com/uhh-lt/dats/blob/main/GLOSSARY.md); the decisions behind the design are the ADRs in [`specs/adr/`](https://github.com/uhh-lt/dats/tree/main/specs/adr) (0007 to 0012 for this architecture, 0013 for the rows of a project, which are identified by `(project_id, id)`). The details of each system live in its README, linked below.

## The model

- **Artefact**: a piece of data DATS computes for a document, such as its tokens, its sentence embeddings or its named-entity spans. A **core artefact** (`always=True`) is computed for every document; an **on-demand artefact** is computed only for projects that need it.
- **Pipeline step**: a background job that computes one or more artefacts of one document from the artefacts it requires. Steps form a graph that is derived from what each step requires and produces.
- **Feature**: a capability a project can enable or disable, such as Semantic Search or Automatic Entity Annotations. A feature requires artefacts, and enabling it computes them for the documents that lack them.
- **Job**: a unit of background work on the RQ workers. Every pipeline step is a job; other jobs (exports, imports, the crawler, the LLM assistant, ...) are started by users or by code.

The three systems in `backend/src/systems/` stack on each other:

```
feature system  ──artefacts──▶  artefact system  ──jobs──▶  job system
```

- The [job system](https://github.com/uhh-lt/dats/blob/main/backend/src/systems/job_system/README.md) runs jobs and pushes their progress to the clients. It knows no pipeline: it calls hooks when a job starts, finishes or fails, and the artefact system registers its step handling there. Its generated endpoints live under `/projects/{project_id}/jobs/<job-type>` (the job type in kebab-case); a start body carries no `project_id`, the job takes the project of the path.
- The [artefact system](https://github.com/uhh-lt/dats/blob/main/backend/src/systems/artefact_system/README.md) holds the artefact and step declarations, the pipeline graph, the step statuses per document and the planning. It is asked in artefacts ("compute these artefacts for this project") and never knows features.
- The [feature system](https://github.com/uhh-lt/dats/blob/main/backend/src/systems/feature_system/README.md) holds the feature declarations, the enabled features of each project, their status and the actions Enable, Complete and Disable. It translates features into artefacts and passes them to the artefact system.

## The three rules

1. **A feature is toggleable only if it requires an artefact outside the core pipeline.** A capability that needs only core artefacts (full-text search, Search & Auto-Annotate) is always available, because there is nothing to save by switching it off. The startup check rejects a feature without an on-demand artefact.
2. **Core declares no feature.** `backend/src/core` holds the concepts every project has (project, document, code, annotation, ...), the search and the standard pipeline; it checks no toggle, so it works the same for every project.
3. **Modules do not import other modules.** A module in `backend/src/modules/` builds on core and the systems only, so it can be understood, changed or removed on its own; small duplication is preferred over a shared service. The lint [`backend/lint/check_layering.py`](https://github.com/uhh-lt/dats/blob/main/backend/lint/check_layering.py) enforces this together with the layering of core and the systems, and lists the remaining exceptions with their reasons.

## Core or module

- **Core** gets what every project needs: a concept every feature builds on, or an artefact every document or several features need. Core artefacts and their steps live in `backend/src/core/artefacts/<name>/`, one folder per artefact; the upload, the health view, retry and recompute live in `backend/src/core/doc_processing/`.
- **A module** gets a capability of its own, with its endpoints, services and jobs. If it needs an artefact that only it reads, the artefact and its step live in the module too (`modules/entity_annotations`, `modules/object_detection`). If it needs an on-demand artefact, the module declares its feature.

## Where an artefact lives

An artefact is declared with `artefact(...)` in a `<name>_artefact.py` file next to the step that produces it: in `core/artefacts/<name>/` for core artefacts and on-demand artefacts that several features read (`sentence_embeddings`, `word_frequencies`), in its module otherwise. Its data is stored where it fits: a column of the document's data row, a metadata key, annotations of the system user with system codes the artefact declares, a table, a Weaviate collection, an Elasticsearch index or files. The [artefact system README](https://github.com/uhh-lt/dats/blob/main/backend/src/systems/artefact_system/README.md#the-registered-artefacts) lists every artefact with its store and the call that reads it. An artefact with a store of its own declares an archive, so the project export and import carry it.

## File storage

The filesystem is split into lifecycle and file access, mirroring `repos/vector`:

- `FilesystemRepo` (`backend/src/repos/filesystem/filesystem_repo.py`) owns the root and project folders. Files are read and written through `FileCRUDBase` subclasses, not by constructing paths from the repository root.
- A file CRUD lives with the core concept, artefact or module that owns its files. It declares a `folder` and the ORM class of its `owner` (`owner = SourceDocumentORM`), or `None` for files such as exports that belong to no database row, so a new module adds a file CRUD without touching any file outside its folder. Its files are stored at `projects/<project_id>/<folder>/<owner_id>/<filename>`. The common interface provides `dir`, `path`, `exists`, `write`, `move_in`, `url`, `delete` and `ids`.
- File CRUDs register themselves and are discovered through their `*_file_crud.py` filenames. When deleting rows, call `FileCRUDBase.delete_by_owner(<Owner>ORM, ...)` so its uploads, thumbnails, extracted audio, models and plots are removed together.
- `crud_temporary_file` manages scratch space and upload or job handovers below `temporary_files/<uuid>/`. Use `folder()` for scratch that must be removed on success or failure. For a handover, pass the id returned by `create()` in the job payload and let the consuming job delete it.

File URLs are relative to `/content/`; the frontend hooks add that prefix. Use `GET /projects/{project_id}/source-documents/{sdoc_id}/urls` for the uploaded file, WebP image and thumbnail (the latter two are `null` until computed), and `GET /projects/{project_id}/perspectives/aspects/{aspect_id}/map-thumbnail-url` for a perspective map thumbnail. Source document URLs are not stored in `SourceDocumentData`; derive them through the file CRUDs and these endpoints.

The concrete file CRUDs and their layout are listed in [`backend/src/repos/README.md`](https://github.com/uhh-lt/dats/blob/main/backend/src/repos/README.md).

## Build a module

The keyword statistics (`backend/src/modules/keyword_statistics/`) are a small, complete example: an on-demand artefact, the step that produces it, the feature that requires it and the gated endpoint that reads it.

1. **The artefact** (`keywords_artefact.py`): the keywords of a document, stored in its metadata key `keywords`, which the feature creates in its project (`create_keywords_metadata`). It has no store of its own, so it needs no archive.

   ```python
   KEYWORDS = artefact("keywords", title="Keywords")
   ```

2. **The step** (`keywords_job.py`): it requires the core artefacts `CONTENT` and `LANGUAGE`, produces `KEYWORDS` for every doctype, and loads its input in its enricher, so it can run after its predecessor, on recompute and in an artefact computation alike.

   ```python
   @pipeline_step(
       requires={CONTENT, LANGUAGE},
       produces={KEYWORDS},
       doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
   )
   @register_job(
       job_type="keywords",
       input_type=KeywordsJobInput,
       enricher=enrich_for_recompute,
   )
   def handle_keywords_job(payload: KeywordsJobInput, job: Job) -> None: ...
   ```

   The graph places the step after the steps that produce its inputs; nothing lists steps by hand. A step has one direct predecessor (the steps producing its inputs depend on each other) and applies to every doctype of the step it follows; the startup check rejects a step that breaks these limits.

3. **The feature** (`keyword_statistics_feature.py`): it requires the on-demand artefact, so it is toggleable, and its set-up hook creates the metadata key `keywords` when a project enables it (safe to run twice).

   ```python
   KEYWORD_STATISTICS = register_feature(
       "keyword_statistics",
       title="Keyword Statistics and Filter",
       description="Extract the keywords of each document, to count them and filter documents by them.",
       area=FeatureArea.ANALYSIS,
       requires_artefacts={KEYWORDS},
       set_up=create_keywords_metadata,
   )
   ```

4. **The endpoint gate** (`keyword_statistics_endpoint.py`): the router that reads keywords declares the feature, so a project without it gets an error instead of empty data. A gate checks that the feature is enabled, never that its data is computed.

   ```python
   router = project_router(
       "/keyword-statistics", tags=["keyword_statistics"], feature=KEYWORD_STATISTICS
   )
   ```

Then regenerate the API client (`just update-api`); the frontend reads the features from `GET /info/features` and needs a change only for a page or a gate. The rules a module developer must follow are in [`.github/instructions/backend-module.instructions.md`](https://github.com/uhh-lt/dats/blob/main/.github/instructions/backend-module.instructions.md).

## Features

| Feature                       | Name                     | Area                 | Requires                                  | Enabled for new projects |
| ----------------------------- | ------------------------ | -------------------- | ----------------------------------------- | ------------------------ |
| Semantic Search               | `semantic_search`        | Search               | `sentence_embeddings`, `image_embeddings` | yes                      |
| Concepts Over Time Analysis   | `concepts_over_time`     | Analysis             | `sentence_embeddings`                     | yes                      |
| Duplicate Finder              | `duplicate_finder`       | Analysis             | `word_frequencies`                        | yes                      |
| Keyword Statistics and Filter | `keyword_statistics`     | Analysis             | `keywords`                                | yes                      |
| RAG Chat                      | `rag_chat`               | Analysis             | `sentence_embeddings`                     | yes                      |
| Word Frequency Analysis       | `word_frequency`         | Analysis             | `word_frequencies`                        | yes                      |
| Annotation Scaling            | `annotation_scaling`     | Automatic Annotation | `sentence_embeddings`                     | yes                      |
| Coreference Resolution        | `coreference_resolution` | Automatic Annotation | `coreferences`                            | no                       |
| Automatic Entity Annotations  | `entity_annotations`     | Automatic Annotation | `ner_spans`                               | yes                      |
| Automatic Object Detection    | `object_detection`       | Automatic Annotation | `object_bboxes`                           | yes                      |
| Quotation Detection           | `quotation_detection`    | Automatic Annotation | `quotations`                              | no                       |
| Tag Recommendations           | `tag_recommendation`     | Automatic Annotation | `document_embeddings`                     | yes                      |

## Artefacts

| Artefact              | Kind      | Lives in                             |
| --------------------- | --------- | ------------------------------------ |
| `audio`               | core      | `core/artefacts/audio`               |
| `content`             | core      | `core/artefacts/content`             |
| `es_index`            | core      | `core/artefacts/es_index`            |
| `file_metadata`       | core      | `core/artefacts/file_metadata`       |
| `html`                | core      | `core/artefacts/html`                |
| `image_caption`       | core      | `core/artefacts/image_caption`       |
| `language`            | core      | `core/artefacts/language`            |
| `raw_html`            | core      | `core/artefacts/raw_html`            |
| `thumbnail`           | core      | `core/artefacts/thumbnail`           |
| `tokens_sentences`    | core      | `core/artefacts/tokens_sentences`    |
| `transcript`          | core      | `core/artefacts/transcript`          |
| `sentence_embeddings` | on demand | `core/artefacts/sentence_embeddings` |
| `word_frequencies`    | on demand | `core/artefacts/word_frequencies`    |
| `coreferences`        | on demand | `modules/coreference_resolution`     |
| `document_embeddings` | on demand | `modules/tag_recommendation`         |
| `image_embeddings`    | on demand | `modules/simsearch`                  |
| `keywords`            | on demand | `modules/keyword_statistics`         |
| `ner_spans`           | on demand | `modules/entity_annotations`         |
| `object_bboxes`       | on demand | `modules/object_detection`           |
| `quotations`          | on demand | `modules/quotation_detection`        |

The registries are the source of truth: `feature_registry` and `artefact_registry` list what is registered at runtime, and `GET /projects/{project_id}/features` lists the features with their status in a project.
