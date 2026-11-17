# DATS

DATS is a collaborative web application that allows research teams to manage, search, annotate, analyze and interpret research materials. We use the following terms throughout the project.

## Language

**User**:
An individual who uses the application.

**Project**:
A collection of source documents, annotations, codes, tags, and memos related to a specific research endeavor.

**Source Document**:
Any document (text, image, audio, video) data that is being analyzed. Short: "sdoc".

**Metadata**:
Information about a source document, such as title, author, date created, etc.

**Project Metadata**:
Defines the metadata keys that exist within a project, their value types, document type, and description.

**Source Document Metadata**:
The actual metadata values of a specific document.

**Tag**:
A label assigned to a source document for categorization.

**Code**:
A category used for annotating source documents.

**Annotation**:
A segment of a source document that has been assigned a code.

**Span Annotation**:
An annotation that applies to a specific span of text within a source document.

**Sentence Annotation**:
An annotation that applies to an entire sentence within a source document.

**Bbox Annotation**:
An annotation that applies to a bounding box within an image document.

**Memo**:
A note or comment added to a source document or annotation.

### Features and preprocessing

**Feature**:
A capability of DATS that a project can enable or disable, and that needs certain artefacts of the project's source documents, at least one of them not a core artefact: enabling it means more processing. It requires artefacts only, never another feature. It is declared by its module with a text name, a title, a description, an area, and whether a new project enables it. Capabilities that need core artefacts only (annotation, full-text search and Search & Auto-Annotate, for example) are always available and are not features in this sense; core declares no feature.
_Avoid_: Feature toggle, feature flag, module (a module holds a feature)

**Artefact**:
A named piece of data that preprocessing computes for a source document, such as its sentence embeddings. It is declared by the code that owns it, with the system codes a project needs before it is produced and, if it has a store of its own, the archive that exports and imports it.
_Avoid_: Output, result, preprocessed data

**Set Up**:
Creating in a project what its features need before anything is computed: the system codes that the artefacts of its features declare, then whatever each feature's set-up hook creates (metadata keys, tags, rows of its own tables). It runs when a feature is enabled, a project is created or a project is imported, is safe to run twice, and disabling a feature keeps what it created.
_Avoid_: Initialization, provisioning

**Module**:
A folder that holds one capability of DATS with its feature (if it needs an artefact outside the core), the artefacts only it uses, their pipeline steps and storage, and its endpoints (e.g. `modules/entity_annotations`, `modules/object_detection`, `modules/tag_recommendation`). A module does not import another module; the remaining exceptions are listed in `backend/lint/check_layering.py`.
_Avoid_: Plugin, package

**Core Artefact**:
An artefact computed for every source document, whatever features its project enables, such as the content, the tokens and sentences, the search index, or the caption of an image (DATS turns every modality into text). All other artefacts are computed only while a feature needs them.
_Avoid_: Default artefact, base data

**Artefact Demand**:
The artefacts the enabled features of a project require, besides the core artefacts. It is derived from the enabled features and never stored; a new source document gets the pipeline steps of the core artefacts and of the artefact demand.
_Avoid_: Needed artefacts, project artefacts

**Pipeline Step**:
One unit of preprocessing for a source document, which requires some artefacts and produces others. Short: "step".
_Avoid_: Job (the job of a step computes it; they share the name), task, stage

**Input Step**:
A pipeline step that produces an artefact another step requires, for one document type.
_Avoid_: Predecessor, dependency, parent step

**Step Status**:
The state of one pipeline step for one source document: not planned, processing, finished or erroneous.
_Avoid_: Job status, processing status

**Document Status**:
The overall state of a source document, derived from the step statuses of its planned pipeline steps: erroneous if one is erroneous, else processing if one is processing, else finished.
_Avoid_: Processed status, sdoc status, health

**Feature Status**:
The state of a feature in a project: disabled (the project does not use it), computing (work for its artefacts is queued or running: a step of them is processing for some document, or an artefact computation of one of them is pending), partly available (nothing runs, and some documents lack its data) or fully available (every document has its data). It decides which feature actions are allowed: Enable when disabled, Complete when partly available, Disable when partly or fully available, none while computing.
_Avoid_: Feature state, readiness, coverage (coverage is the share of documents that are ready)

**Step Planning**:
Deciding which pipeline steps a source document gets a step status for: on upload from the core artefacts and the artefact demand of its project, in an artefact computation from the core artefacts and the computed artefacts.
_Avoid_: Scheduling, activation (an artefact computation triggers step planning)

**Artefact Computation**:
The background work that plans and starts the pipeline steps of some artefacts for the existing source documents of a project, in batches, after a user enables or completes a feature that needs them. Its artefacts are fixed when it starts.
_Avoid_: Feature activation (its former name), enabling (enabling is the user's action), planning job

**Step Run**:
One execution of the job of one pipeline step for one source document.
_Avoid_: Job run, task, step job (the job is what runs; a step run is one run of it)

**Artefact Archive**:
How one artefact of a source document travels in a project export: read from its own store, checked for completeness, and written back on import. Declared with the artefact; an artefact without an own store travels with the data, metadata or annotations of its document.
_Avoid_: Exporter, serializer, artefact handler
