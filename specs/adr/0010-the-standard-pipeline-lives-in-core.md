# ADR 0010: The standard pipeline lives in core, one job per step

**Date:** 2026-11-14

The placement rule: an artefact that every document needs, or that several features read, belongs to core, with the step that produces it; an artefact only one feature reads belongs to that feature's module. The upload, the always-computed steps and the shared on-demand artefacts (the search index, the word frequencies and the sentence embeddings) therefore move from `modules/doc_processing` to `core/doc_processing`, and the storage of the word frequencies moves to `core/doc`. The single-user steps (image and document embeddings, keywords, named-entity spans, object boxes) stay in `modules/doc_processing` until each moves to its module, each with one feature file. Core imports no module: the sentence embedding step calls Ray itself instead of the embedding service of `modules/ml`, the caption prompt lives next to the caption step, and the read DTO of the word frequencies stays with the word frequency endpoint.

Every pipeline step is computed by a job of its own, named like the step. The spaCy job computed keywords, word frequencies and named entities as "further steps" in the same run, so the job input named the steps to compute, a finished run started the jobs of several steps and re-ran itself for steps planned while it ran. One job per step deletes this mechanism: a step that needs spaCy calls it itself, and keywords, which never used spaCy (YAKE runs on the text), call nothing. The price is one spaCy call per step instead of one per document when several of keyword statistics, word frequency analysis and entity annotations are enabled; a shared call for several steps is later work. Step names, step status rows and the API do not change.

Deploy: the Redis queues and the failed registry must be empty, as a `text_spacy` job stored before names the further step it was started for and a retry of it would compute tokens and sentences only; afterwards `project.artefact_computations` is reset (O14).

Closes uhh-lt/dats#900.
