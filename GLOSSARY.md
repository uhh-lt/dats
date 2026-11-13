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
A capability of DATS that a project can enable or disable, and that needs certain artefacts of the project's source documents. Capabilities that need core artefacts only (annotation, for example) are always available and are not features in this sense.
_Avoid_: Feature toggle, feature flag, module

**Artefact**:
A named piece of data that preprocessing computes for a source document, such as its sentence embeddings. Core artefacts are computed for every document.
_Avoid_: Output, result, preprocessed data

**Pipeline Step**:
One unit of preprocessing for a source document, which requires some artefacts and produces others. Short: "step".
_Avoid_: Job (a job runs one or more steps), task, stage

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
The state of a feature in a project: disabled, computing (a step of it is processing for some document, or a feature activation is pending), partly available (some documents lack its data and nothing runs for them) or fully available.
_Avoid_: Feature state, readiness, coverage (coverage is the share of documents that are ready)

**Step Planning**:
Deciding which pipeline steps a source document gets a step status for, from the features its project has enabled.
_Avoid_: Scheduling, activation (a feature activation triggers step planning)

**Feature Activation**:
The background work that plans and starts a feature's pipeline steps for the existing source documents of a project, in batches, after a user enables, completes or restarts the feature.
_Avoid_: Enabling (enabling is the user's action), planning job

**Step Run**:
One execution of a job for some of the pipeline steps of one source document.
_Avoid_: Job run, task, step job (the job is what runs; a step run is one run of it)

**Artefact Archive**:
How one artefact of a source document travels in a project export: read from its store, checked for completeness, and written back on import, or carried by another part of the archive.
_Avoid_: Exporter, serializer, artefact handler
