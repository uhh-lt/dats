# Artefact system

The artefacts and the pipeline steps that produce them: their declarations (`artefact(...)`, `@pipeline_step`, `artefact_registry.py`), the graph between them (`pipeline_graph.py`), the step planning and the availability of artefacts (`artefact_service.py`), the step runs (`step_execution.py`) and the step statuses (`source_document_step_status_*.py`, `source_document_status_rules.py`). It knows artefacts and steps, never features: the feature system passes it artefacts. The terms are in `GLOSSARY.md`.

## What it is asked

| Call                                  | Caller                                    | What it does                                                                                                                         |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ArtefactService.set_up`              | Enable, project creation, project import  | Creates the system codes the artefacts declare, those of the artefacts their steps require and those of the always-computed ones.   |
| `ArtefactService.compute`             | Enable and Complete of a feature          | Stores a pending artefact computation of the feature's artefacts and starts its job, which plans and starts the steps in batches.   |
| `ArtefactService.read_availability`   | The feature status                        | Counts the documents per artefact set: ready, processing, failed, not planned; and whether a computation of them is pending.         |
| `ArtefactService.plan_document`       | The upload (`sdoc_init`)                  | Plans the steps of the core artefacts and of the project's artefact demand for a new document; returns its root steps to start.      |
| `ArtefactService.plan_core_steps`     | Recompute of a core step without a row    | Plans the missing core steps of some documents in a transaction of its own, then starts those whose inputs are finished.             |
| `start_steps`                         | Advancing, upload, computation, Recompute | Starts the jobs of some steps of a document.                                                                                         |

Disable calls nothing: the stored data and the step statuses stay. A computation plans the steps of the core artefacts and of those of its artefacts that apply to the doctype (a set applies if one of its artefacts has a producer for the doctype: Semantic Search computes the sentence embeddings of every document and the image embeddings of the images), and plans their erroneous steps again; it never plans the steps of other artefacts.

## Declaring an artefact

An artefact is declared by the code that owns it, in a file that its steps and features import (`<name>_artefact.py`, next to the steps that produce it: `core/artefacts/<name>/` holds the standard ones, one folder per artefact):

```python
KEYWORDS = artefact("keywords", title="Keywords", store=MetadataValue("keywords"))
```

| Argument       | Meaning                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | Required. Short and user-facing, in the style of the feature titles ("Tokens and sentences"): the health view titles a step's column by the artefacts it produces, and a feature shows the artefacts it needs. |
| `always`       | Computed for every document, whatever features its project enables (a core artefact). A step produces either always-computed or on-demand artefacts.    |
| `uploaded_for` | The doctypes whose uploaded file is the artefact, so no step produces it there (the audio stream of an audio document).                                  |
| `store`        | Required. Where the data is and the only way to it (`ARTEFACT.store.read(...)`): one of the store types below, or the CRUD of a store of its own. |
| `archive`      | For an artefact with a store of its own (a table, index or file): an `ArtefactArchive` that reads the artefact for the project export, says whether an archive holds it completely and writes it on import. Without it, the generic export of document data, metadata and annotations carries the artefact. |

The name never changes without a data migration: step status rows, pending computations and archives store it. A step names the artefacts it requires and produces with the imported objects (`@pipeline_step(requires={CONTENT}, produces={KEYWORDS}, ...)`); tests name them by text (`artefact_named` in `backend/test/pipeline_test_utils.py`).

The startup check (`artefact_registry.check()`, from `bootstrap.register_jobs`) rejects two artefacts whose stores own the same document data column, metadata key, annotation code or span group, an artefact no step produces and no upload provides, a step that mixes always-computed and on-demand artefacts, the step of an always-computed artefact that requires an on-demand one, and a system code name that two declared trees (of one artefact or of two) give a different parent, description or `enabled` flag.

## The stores

An artefact in the core entities owns its share of them through a store type of `stores/`; a step writes only through the stores of the artefacts it produces, and code that means the artefact reads it through its store. Code that means all metadata or all annotations of a document (the metadata panel, the annotation view, the export) keeps the core CRUDs.

| Store type                                            | Owns                                                                     | Offers                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `DocumentData(*columns)`                              | Columns of the document's data row (`SourceDocumentDataORM`); the only user of `crud_sdoc_data` | `read` (the row), `read_many` (the rows with the store's columns and those of `with_stores`, e.g. the content that the token offsets point into), `write`. `create_document_data` creates the row of a new document (upload, import). |
| `MetadataValue(*keys)`                                | Metadata keys of the document                                            | `read` and `read_by_project` (a store of one key), `write`                                                                |
| `SystemSpans(*codes, group=None)`, `SystemBBoxes(*codes)` | The system user's span or bbox annotations with the codes of the trees (and span groups of the name) | `code_ids`, `annotation_document_id`, `replace`, `replace_groups` and `clear` (spans). The trees are the artefact's `codes`, which the set up creates (`SystemCode`, `core/code/system_codes.py`). |

A write of data the store does not own raises `ForeignArtefactDataError`.

Deletion is not declared: a store goes with its document as before (foreign key cascades, the document's files, the Elasticsearch delete and the Weaviate loop in `SourceDocumentService`).

Limit of the archive: the document archive has no open column. The archive columns of today's own stores (`word_frequencies`, `document_embedding`, `image_embedding`, `sentence_embeddings`) are fixed fields of `SourceDocumentExportSchema` in `modules/eximport`. A new artefact with an own store adds its column there.

## The registered artefacts

Core artefacts (`always=True`) are computed for every document and need no declaration by a feature; on-demand artefacts are only present when a feature that requires them is enabled (or was, as Disable keeps the data). A step finished for the document says the artefact is there (`ArtefactService.read_availability`, the health view); read it through its store as below.

| Artefact              | Kind      | Declared in                                                    | Store                                                                                                   | Read with                                                                                          |
| --------------------- | --------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `audio`               | core      | `core/artefacts/audio/audio_artefact.py`                       | `crud_audio_file`: `audio/<sdoc_id>/audio.mp3` of a video; of an audio document the uploaded file (`crud_sdoc_file`) | `audio_stream_path(project_id=..., sdoc_id=..., doctype=..., filename=...)` (`audio_artefact.py`) |
| `content`             | core      | `core/artefacts/content/content_artefact.py`                   | `DocumentData("content")`                                                                               | `CONTENT.store.read(db=db, sdoc_id=sdoc_id).content`, `CONTENT.store.read_many(...)`               |
| `es_index`            | core      | `core/artefacts/es_index/es_index_artefact.py`                 | `crud_sdoc_elastic`: Elasticsearch, index `docs` of the project                                         | `ES_INDEX.store.read(client=..., project_id=..., id=sdoc_id)`; searched through `core/search`      |
| `file_metadata`       | core      | `core/artefacts/file_metadata/file_metadata_artefact.py`       | `MetadataValue(...)`: the keys of images (`width`, `height`, `format`, `mode`), audio and video (ffprobe fields) | Only the metadata panel (all metadata) reads it                                              |
| `html`                | core      | `core/artefacts/html/html_artefact.py`                         | `DocumentData("html")`                                                                                  | `HTML.store.read(db=db, sdoc_id=sdoc_id).html`                                                     |
| `image_caption`       | core      | `core/artefacts/image_caption/image_caption_artefact.py`       | `MetadataValue("caption")`                                                                              | `IMAGE_CAPTION.store.read(db=db, sdoc_id=sdoc_id)`                                                 |
| `language`            | core      | `core/artefacts/language/language_artefact.py`                 | `MetadataValue("language")`                                                                             | `LANGUAGE.store.read(db=db, sdoc_id=sdoc_id).str_value`                                            |
| `raw_html`            | core      | `core/artefacts/raw_html/raw_html_artefact.py`                 | `DocumentData("raw_html")`                                                                              | `RAW_HTML.store.read(db=db, sdoc_id=sdoc_id).raw_html`                                             |
| `thumbnail`           | core      | `core/artefacts/thumbnail/thumbnail_artefact.py`               | `crud_thumbnail_file`: `thumbnails/<sdoc_id>/image.webp` (image) and `thumbnails/<sdoc_id>/thumbnail.webp` (image, video); the audio step stores none | `THUMBNAIL.store.url(project_id=..., id=sdoc_id, name=IMAGE_FILENAME)` / `THUMBNAIL_FILENAME` |
| `tokens_sentences`    | core      | `core/artefacts/tokens_sentences/tokens_sentences_artefact.py` | `DocumentData("token_starts", "token_ends", "sentence_starts", "sentence_ends")`: character offsets in the content; of an audio or video, the tokens are the words of its transcript | `TOKENS_SENTENCES.store.read(db=db, sdoc_id=sdoc_id).sentences`, `TOKENS_SENTENCES.store.read_many(db=db, sdoc_ids=..., with_stores=[CONTENT.store])` |
| `transcript`          | core      | `core/artefacts/transcript/transcript_artefact.py`             | `DocumentData("transcript_word_starts", "transcript_word_ends", "transcript_word_time_starts", "transcript_word_time_ends")`: offsets in the content and times of the words | `TRANSCRIPT.store.read(db=db, sdoc_id=sdoc_id).word_level_transcriptions`               |
| `sentence_embeddings` | on demand | `core/artefacts/sentence_embeddings/sentence_embeddings_artefact.py` | `crud_sentence_embedding`: Weaviate collection `Sentence`, one object per sentence                | `SENTENCE_EMBEDDINGS.store.read_by_sdoc_id(client=..., project_id=..., sdoc_id=...)`              |
| `word_frequencies`    | on demand | `core/artefacts/word_frequencies/word_frequencies_artefact.py` | `crud_word_frequency`: table `wordfrequency`                                                            | `WORD_FREQUENCIES.store.read_by_project_and_doctype(...)` (a project)                              |
| `coreferences`        | on demand | `modules/coreference_resolution/coreference_artefact.py`       | `SystemSpans(MENTION_CODES, group="coref")`: one span group per cluster                                 | Only the annotation view (all annotations) reads it                                               |
| `ner_spans`           | on demand | `modules/entity_annotations/ner_artefact.py`                   | `SystemSpans(NAMED_ENTITY_CODES)`                                                                       | Only the annotation view (all annotations) reads it                                               |
| `object_bboxes`       | on demand | `modules/object_detection/object_detection_artefact.py`        | `SystemBBoxes(*COCO_CODES)` (`HUMAN` for people)                                                        | Only the annotation view (all annotations) reads it                                               |
| `quotations`          | on demand | `modules/quotation_detection/quotation_artefact.py`            | `SystemSpans(QUOTATION_CODES, group="quote")`                                                           | Only the annotation view (all annotations) reads it                                               |
| `image_embeddings`    | on demand | `modules/simsearch/image_embedding_artefact.py`                | `crud_image_embedding`: Weaviate collection `Image`, one object per image                               | `IMAGE_EMBEDDINGS.store.read(client=..., project_id=..., id=ImageObjectIdentifier(sdoc_id=...))`   |
| `keywords`            | on demand | `modules/keyword_statistics/keywords_artefact.py`              | `MetadataValue("keywords")`                                                                             | `KEYWORDS.store.read_by_project(db=db, project_id=...)`                                            |
| `document_embeddings` | on demand | `modules/tag_recommendation/document_embedding_artefact.py`    | `crud_document_embedding`: Weaviate collection `Document`, one object per document                      | `DOCUMENT_EMBEDDINGS.store.read(client=..., project_id=..., id=DocumentObjectIdentifier(sdoc_id=...))` |

## The set up

`ArtefactService.set_up` creates the system codes the artefacts of some features declare, with `crud_code.create_system_codes`: those of the artefacts, of the artefacts their steps require and of the always-computed artefacts. It is idempotent and does nothing without declared codes. A user code of a declared name, or a system code of that name with another parent, fails it with a 409 (`SystemCodeConflictError`).

| Caller                                           | When                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `FeatureService.enable_feature`                  | Before it computes the artefacts of the feature                            |
| `ProjectService.create_project`                  | For the features the new project enables                                   |
| `import_project.py`                              | Once, before the entities of the archive: its codes then meet the system codes by name |

Complete runs no set up, and neither does `add_features` (the import has set up before). Disable leaves the codes, as annotations may use them. Recompute never plans the step of a feature: it is rejected (400, `StepNotPlannedError`) for a document that has no status row of the step, so it never runs a step whose set up did not run. A core step needs no set up: where it has no row, e.g. for a document imported while its core steps ran, Recompute plans all missing core steps of the selected documents (`ArtefactService.plan_core_steps`) and starts those whose inputs are finished.

## Lock order

Every planning first locks the project row (`crud_project.read_locked`: FOR NO KEY UPDATE to change the enabled features or the pending computations, FOR SHARE to plan a new document or a batch of a computation), then the documents it plans per doctype in the order of `DocType`, ascending by id within a doctype (FOR NO KEY UPDATE). A change of the features waits for the batch in progress; an upload and a batch plan side by side (the upload plans a new document, which is not in the batch); a status change of a document waits for the planning of that document, so the planning never misses a step that finishes while it plans. The feature system only ever locks the project row. A writer outside this order could deadlock or lose a planning without any test failing.

The upload reads the artefact demand under the project share lock (`FeatureService.read_artefact_demand`) and plans with it in the same transaction, so a concurrent Enable waits for the upload and plans its steps for the new document too, or the upload plans them.

`plan_core_steps` takes the same locks in its own transaction and commits before it starts the steps, as `start_steps` writes a step that cannot start in a transaction of its own.

Enable and Complete start the computation job before their transaction commits: the job's first statement is a share lock on the project, which waits for the request's lock, so the job reads the committed state. If the enqueue fails, the request rolls back; if the request rolls back after the enqueue, the job finds no pending computation with its id and stops.

## Step runs

A step run is one run of the job of one pipeline step for one document; the job is named like its step and computes that step only. A step is named like its job file without `_job` (`tokens_sentences_job.py` runs `tokens_sentences`), with a doctype prefix only where there is one step per doctype (`image_thumbnail`, `audio_thumbnail`). A finished step starts its planned successors with a bare `SdocProcessingJobInput`, and the successor's enricher loads its input from the stored data. The jobs that create documents (the entry points `crawler`, `extract_archive`, `doc_chunking`, `html_extraction` and `sdoc_init`) start what follows them themselves, at the end of their handlers.

## Failures

One rule: whatever goes wrong, the step becomes erroneous, with the pending steps after it. Complete retries it; Recompute in the document health view does too.

| What goes wrong                                                 | The step becomes                                                                         | How the user recovers |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------- |
| A step job raises                                               | erroneous                                                                                | Complete or Recompute |
| A step job cannot start: its input data is missing              | erroneous                                                                                | Complete or Recompute |
| A step job cannot start: the queue (Redis) is down              | erroneous (computation, advancing and recompute alike)                                   | Complete or Recompute |
| A worker dies in the middle of a step                           | erroneous, once RQ notices (see below)                                                   | Complete or Recompute |
| A worker dies in the middle of an artefact computation          | the computation ends, the documents it did not reach stay not planned: partly available  | Complete              |
| The queue is down when Enable or Complete starts the computation | nothing changes; the request answers 503                                                | Try again             |

`start_steps` applies the rule for every start path. The failed hook (`step_execution.handle_job_error`) applies it for every failed job; for an artefact computation it removes the pending computation instead, so its artefacts are no longer pending.

Accepted gap: a process dies after it wrote "processing" and before it queued the job (the backend in an upload, a worker between a computation batch's commit and its starts, or between a finished step and its successors). The step stays processing without a job, and the feature stays Computing. Recompute in the document health view starts it.

Known gap: a step that commits finished just before a planning can start a successor that the planning starts too; it computes twice.

## How a dead worker is noticed

DATS has no detector of its own. RQ reports a dead job through the job's failure callback, `job_handler.rq_job_failed`, which every job gets at enqueue (`on_failure`). It runs the failed hook once per failed job, also for an ordinary exception.

| Who dies                                     | Who calls the callback                                                                                                    | Delay (measured with RQ 2.12)                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| The job process of the forking GPU worker    | its worker, at once (`DATSWorker.handle_work_horse_killed`; RQ itself skips the callback there)                           | 0.15 s                                                    |
| A CPU or API worker (`SimpleWorker`)         | a live worker's maintenance (every 10 min) cleans the started jobs once the dead job's entry expired (job timeout + 60 s) | 13.3 min for a 60 s timeout; up to timeout + about 18 min |
| The GPU worker together with its job process | the same maintenance; the entry expires 90 s after the last heartbeat                                                     | 13.5 min                                                  |

Step jobs run on CPU and API workers with the default timeout of 1 hour, so a dead step worker is noticed after 1 to 1.3 hours. An artefact computation has a timeout of 1 day. The GPU parent holds no database connection; it connects only while it runs the callback (`worker._sql_connection`).
