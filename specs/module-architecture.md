# Design: features, artefacts and self-contained modules

Status: implemented. PR A (the per-project feature toggles and the actions rework), PR B (captions are core; the artefact system), PR C (open registries, storage kinds, codes on the artefacts), PR D (one job per step, the standard pipeline in core), PR E (the single-user artefacts in their modules), PR F (`modules/ml` dissolved) and PR G (independent modules, search in core, Semantic Search) are built. It builds on the per-project feature toggles (uhh-lt/dats#892) and replaces the placement decisions made there.

## Goal

A developer adds a capability to DATS by writing one module. The module declares its feature, the artefacts the feature needs, and how these artefacts are produced, stored, exported and imported; deletion stays central. Outside the module, only the copies of the project doctor change (its list of steps and, for declared codes, its `system_codes.yaml`), and for an artefact with its own store the column of the document archive.

Two cases must both be one small step:

| Case                                                            | What the developer writes                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| A feature that needs an artefact DATS already computes          | One feature declaration that names the artefact               |
| A feature that needs a new artefact (coreference visualization) | The artefact, the pipeline step that produces it, the feature |

## The model

- A **feature** requires artefacts, at least one of them outside the core preprocessing pipeline, and never another feature. It knows nothing else.
- An **artefact** knows how it is produced, stored, exported and imported, and which codes a project needs before it can be produced. How it is deleted is not declared: deletion stays central.
- A **pipeline step** produces artefacts from other artefacts.
- A **project** enables features. The artefacts its enabled features require are the project's **artefact demand**.

## Text is core

DATS turns every modality into text: text is text, audio and video are transcribed, images are captioned. After that, the same text pipeline runs for every document.

This is not toggleable. Image captions become a core artefact that is always computed, and the feature "Image captions" is removed. Consequence: every document of every project has text, so every text artefact applies to every document. The special case "enabling captions makes other features' text steps possible for images" disappears from the planning.

## Three systems

```
feature system  -->  artefact system  -->  job system
                           ^
     core and the modules register artefacts, steps and features
```

| System              | Owns                                                                                                                                                  | Does not know                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Feature system**  | The registered features, the enabled features of a project, the feature statuses, the three actions and their endpoints, the "feature disabled" check | Pipeline steps, documents, how an artefact is produced |
| **Artefact system** | The registered artefacts and pipeline steps, the graph between them, step planning, step statuses, step runs, the failure rule, availability          | Features                                               |
| **Job system**      | Queues, workers, job status                                                                                                                           | Everything above                                       |

Dependencies point in one direction. No system imports a module, and the lint rule needs no exception.

### What the two systems say to each other

Only the feature system and the upload talk to the artefact system:

| Call                                      | When                     | Meaning                                                                                                                                             |
| ----------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Compute these artefacts in P"            | Enable, Complete         | The feature system passes the artefacts of the feature; the artefact system plans and starts the missing pipeline steps for the project's documents |
| "How available are these artefacts in P?" | Reading a feature status | Counts: documents that have them, documents being computed, documents lacking them                                                                  |
| "Plan this new document for this demand"  | Upload                   | The upload passes the artefact demand of the project; the artefact system plans the steps of the core artefacts and of the demand                   |

Disable calls nothing in the artefact system: the stored data and the step statuses stay.

The feature system turns the counts into Disabled, Computing, Partly available or Fully available and applies the status-by-action table. The statuses and the three actions are documented in `backend/src/systems/feature_system/README.md`, the failure rule in `backend/src/systems/artefact_system/README.md`.

The demand is not stored twice. It is always derived from the enabled features; only the upload passes it to the artefact system, read under the project share lock. Enable and Complete pass the artefacts of the feature only.

## What a module declares

Coreference resolution, shortened from `modules/coreference_resolution`:

```python
# coreference_artefact.py
MENTION_CODES = SystemCode("MENTION", "Co-reference mention")

COREFERENCES = artefact(
    "coreferences",
    kind=StorageKind.ANNOTATIONS,        # travels with the annotations
    codes=(MENTION_CODES,),              # what a project needs first, as data
)


# coreference_resolution_job.py
@pipeline_step(
    requires={TOKENS_SENTENCES, LANGUAGE},
    produces={COREFERENCES},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(job_type="coreference_resolution", input_type=..., enricher=..., device="api")
def handle_coreference_resolution_job(payload, job): ...


# coreference_resolution_feature.py
COREFERENCE_RESOLUTION = register_feature(
    "coreference_resolution",
    title="Coreference Resolution",
    description="...",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={COREFERENCES},
    default_enabled=False,
)
```

A feature that reuses an existing artefact:

```python
# modules/rag/rag_feature.py
from core.doc_processing.artefacts import SENTENCE_EMBEDDINGS

register_feature("rag_chat", ..., requires_artefacts={SENTENCE_EMBEDDINGS})
```

### The life of an artefact

| Stage             | Declared by the artefact                                                       | Before                                                          |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Set up            | The codes the project needs first, declared as data                            | All codes are listed in the config and created in every project |
| Produce           | The pipeline step and its inputs                                               | Declared on the step, in one module                             |
| Store             | Where it is stored (see below); the storage itself does not change             | Not declared                                                    |
| Export and import | Follows from where it is stored                                                | One central table in the export module                          |
| Delete            | Not declared: stays central (cascades, the Elasticsearch and Weaviate deletes) | Central                                                         |

The set up runs when a project first demands the artefact and creates what is missing. Disabling a feature leaves the codes, as annotations may use them. The list of system codes leaves the config files: each module defines its own codes.

### Where an artefact is stored

Nothing moves. An artefact keeps the storage it has today and only declares which kind it is. Export, import and deletion follow from the kind, so most artefacts need no code for them. This is what the artefact archive of uhh-lt/dats#892 does already; the entry moves from the central table to the artefact's declaration.

| Kind          | Stored in                           | Export, import, delete              | Examples                                              |
| ------------- | ----------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| Document data | The source document data            | Travels with the document           | Content, tokens and sentences, HTML                   |
| Metadata      | Source document metadata            | Travels with the metadata           | Language, file metadata, keywords                     |
| Annotations   | Span or bbox annotations with codes | Travels with the annotations        | Named-entity spans, object boxes, coreferences        |
| Own store     | A table, index or file of its own   | The artefact brings its own archive | Embeddings, search index, word frequencies, thumbnail |

A new artefact picks a kind. Only "own store" needs code, for export and import (its archive); deletion stays central for every kind.

Tables that hold a feature's results (the tag recommendations, for example) are not artefacts: nothing requires them and no pipeline step produces them. They stay ordinary module tables.

### Open registries

Artefacts, pipeline steps and features are declared by the code that owns them. The central lists `Artefact`, `Feature` and the step names in `JobType` go away.

- The check moves from the type checker to the start of the backend: an artefact without a producer, a cycle, a missing artefact archive or a duplicate name stops the start.
- Names are stored as text in the database (step statuses, enabled features).
- The frontend reads the features from the backend. It keeps its own list only for the features it has pages or menu entries for.

## Where artefacts live

Rule: an artefact that every document needs, or that several features use, lives in core. An artefact that one feature uses lives in that feature's module. It is promoted to core when a second user appears.

Based on the declarations in uhh-lt/dats#892, implemented for every row:

| Lives in                               | Artefact                                                                                                                                         | Used by                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Core, always computed                  | Raw HTML, content, language, tokens and sentences, HTML, thumbnail, file metadata, audio stream, transcript, **image caption**, **search index** | Every document; the search (`core/search`) and Search & Auto-Annotate |
| Core, computed on demand               | Word frequencies                                                                                                                                 | Word frequency, Duplicate finder                                      |
| Core, computed on demand               | Sentence embeddings                                                                                                                              | Semantic Search, RAG Chat, Annotation Scaling, Concepts Over Time     |
| `modules/simsearch`                    | Image embeddings                                                                                                                                 | Semantic Search                                                       |
| `modules/tag_recommendation`           | Document embeddings                                                                                                                              | Tag recommendation                                                    |
| `modules/statistics`                   | Keywords                                                                                                                                         | Keyword statistics                                                    |
| `modules/entity_annotations` (new)     | Named-entity spans                                                                                                                               | Entity annotations                                                    |
| `modules/object_detection` (new)       | Object boxes                                                                                                                                     | Object detection                                                      |
| `modules/coreference_resolution` (new) | Coreferences                                                                                                                                     | Coreference resolution                                                |
| `modules/quotation_detection` (new)    | Quotations                                                                                                                                       | Quotation detection                                                   |

## Three rules (PR G)

Decided after PR F, recorded in `specs/adr/0012-features-need-processing-core-has-none-modules-stand-alone.md`:

1. **Toggle rule:** a feature exists only if it requires an artefact that is not a core artefact; enabling it means more processing. A feature requires artefacts only, never another feature. Features that share an artefact share its computation, not each other.
2. **Core rule:** core declares no feature and checks no toggle. Everything in core is always available. Core may own on-demand artefacts that several modules use (word frequencies, sentence embeddings); only the features of modules decide whether they are computed.
3. **Module rule:** a module does not import another module (`backend/lint/check_core.py`, with the remaining pairs listed as exceptions: export/import, and experiment on agreement and the LLM assistant). Small duplication in modules is preferred over a shared service.

Consequences: the search moved to `core/search` and its index is a core artefact, so Full-Text Search and Search & Auto-Annotate are no features; Sentence Search and Image Search are one feature, Semantic Search; RAG Chat, Annotation Scaling and Concepts Over Time require the sentence embeddings and embed their queries themselves.

## Where code lives afterwards

| Place                     | Content                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `systems/feature_system`  | Feature registry, enabled features, statuses, actions, endpoints                                  |
| `systems/artefact_system` | Artefact and step registry, pipeline graph, step planning, step runs, step statuses, availability |
| `systems/job_system`      | Unchanged                                                                                         |
| `core/doc_processing`     | The standard pipeline: upload, the core steps, the shared on-demand artefacts                     |
| `modules/<capability>`    | One feature with its own artefacts, steps, storage, endpoints                                     |

Removed:

| Removed                                    | Replaced by                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `modules/doc_processing`                   | `core/doc_processing` and the feature modules                                                      |
| `modules/project_features`                 | The feature system                                                                                 |
| `modules/ml` (ML jobs, their status table) | Coreference, quotation and tag recommendation modules with normal pipeline steps and step statuses |
| The embedding service                      | Each embedding step, and the search that embeds a query, calls the model service itself            |
| The system codes in the config             | The set up of each artefact                                                                        |
| The feature "Image captions"               | Captions are core                                                                                  |

This also resolves issue 884 (the ML job status table), issue 885 (the central job type list, for steps) and issue 900 (document processing in core).

## Decisions

| Topic                       | Decision                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The spaCy step              | Each step that needs spaCy calls it itself (tokens and sentences, word frequencies, named-entity spans). No step knows about the others. This is slower when several are demanded; optimizing it is later work. The "further steps" of a job are removed. Keywords become a step of their own as well; they do not use spaCy. |
| Captions for every image    | No concern: the feature toggles are not deployed, so no project has captions off.                                                                                                                                                                                                                                             |
| ML Automation page          | Deleted from the frontend.                                                                                                                                                                                                                                                                                                    |
| ML job statuses             | No migration: nobody used coreference and quotation so far. The table is dropped.                                                                                                                                                                                                                                             |
| Storage                     | Unchanged; an artefact declares its kind (see "Where an artefact is stored").                                                                                                                                                                                                                                                 |
| Sentence embeddings         | Core, by the general rule: the code inventory found three direct readers.                                                                                                                                                                                                                                                     |
| Order of the work           | Captions become core first, before the artefact system is built. Then no planning question depends on which other features are enabled.                                                                                                                                                                                       |
| Name of the background work | "Feature Activation" becomes "Artefact Computation": the artefact system computes artefacts and does not know features.                                                                                                                                                                                                       |
| Codes                       | An artefact declares its codes as data. The artefact system creates them when a project first demands the artefact.                                                                                                                                                                                                           |

## Decided questions

1. **Codes that belong to no feature.** There are none left: every system code tree is declared by an artefact, and a project without such a feature has no system codes.
2. **Default features of a new project.** A feature declares `default_enabled`; coreference resolution and quotation detection are off, as they run a hosted model for every German text document.
3. **A user code named like a system code.** Enabling the feature is rejected with 409 and a message that says what to rename, instead of adopting the user's code.
4. **Coreference and quotation.** They stay limited to German text documents; their groups (clusters) are not part of a project export.

The implementation briefs with the exact interfaces are in `.architecture-reviews/arch-*.md` (not committed).

## Work packages

Each package leaves DATS working and is one pull request, stacked on the one before. They can be merged into one pull request at the end.

| PR  | Package                                                                                                                                                                                                                | Kind                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| A   | uhh-lt/dats#892 as it is, plus the actions rework (three actions, one failure rule)                                                                                                                                    | Exists                    |
| B   | Captions always computed; the feature "Image captions" removed (first part). Artefact system: move the graph, planning, step runs and statuses into a system; the feature system talks in artefacts; no lint exception | Changes what A introduces |
| C   | Open registries: artefacts, steps and features declared by their owner; set up and storage kind per artefact; codes leave the config                                                                                   | Changes what A introduces |
| D   | Standard pipeline into `core/doc_processing`; one spaCy call per step                                                                                                                                                  | Move and behaviour change |
| E   | Feature modules: the single-user artefacts and their steps move into their modules                                                                                                                                     | Move                      |
| F   | Dissolve `modules/ml`: coreference and quotation as features, tag recommendation as a module; drop the embedding service and the ML Automation page                                                                    | Move                      |
| G   | The three rules: features require artefacts only; search in core with a core index, no search features; one feature Semantic Search; modules decoupled; the module import lint                                         | Change and move           |

Each pull request updates the glossary, ADRs, READMEs and instruction files it touches. The frontend reads the features from the registry from C on.

The terms of this design (Artefact Demand, Core Artefact, Module and the others) are defined in `GLOSSARY.md`.
