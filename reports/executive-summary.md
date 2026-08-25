# DATS Executive Summary — September 2024 to August 2026

A chronological compilation of the themes, major contributions, and summaries from the quarterly reports. For details, see the individual quarterly reports and [major-contributions2024-2026.md](major-contributions2024-2026.md); for numbers, see [statistics2024-2026.md](statistics2024-2026.md).

---

## Q3 2024 (September)

**Theme:** LLM integration kickoff & codebase cleanup

**Major contribution:** [LLM Integration (#412)](https://github.com/uhh-lt/dats/pull/412) — the first LLM capability in DATS.

September 2024 marked the start of LLM-powered features in DATS with the integration of an Ollama client into the backend and Celery worker, enabling an LLM assistant for document tagging. In parallel, a substantial cleanup removed legacy concepts (adocs, current code, code-user relations, unused DB data), and usability improvements landed based on feedback from the climate change project.

---

## Q4 2024 (October – December)

**Theme:** Search performance, memo editing, and ML-assisted annotation scaling

**Major contributions:**

- [Improve search (#462)](https://github.com/uhh-lt/dats/pull/462) — rewrite of the search/filter/sort system with a dynamic query builder.
- [Block note editor (#454)](https://github.com/uhh-lt/dats/pull/454) — modern block-based editor for memos.
- [Annotation scaling (#477, #479)](https://github.com/uhh-lt/dats/pull/477) — ML-suggested annotation candidates (backend + first frontend).

This quarter focused on core platform quality. The search system was rewritten with a builder component that dynamically joins only the tables required by the active filters and sorts, drastically improving query performance. Memos received a modern BlockNote-based editor, rolled out to all memo types. The first ML-assisted annotation feature landed: annotation scaling, which suggests candidate sentences for a given annotation type that users can confirm or reject. Additionally, the backend test suite was reworked, configuration was simplified, and analysis results became exportable.

---

## Q1 2025 (January – March)

**Theme:** ML-powered annotation & document understanding (recommendations, quotation & coreference detection, sentence annotations) plus a full import pipeline

**Major contributions:**

- [Sentence annotations (#481)](https://github.com/uhh-lt/dats/pull/481) — new annotation type for whole sentences.
- [Document tag recommendation backend (#504)](https://github.com/uhh-lt/dats/pull/504) — automatic tag suggestions.
- [Quotation detection (#506)](https://github.com/uhh-lt/dats/pull/506) and [coreference resolution (#521)](https://github.com/uhh-lt/dats/pull/521) — new discourse-level NLP analyses.
- [Import for text, audio, video pipelines (#435)](https://github.com/uhh-lt/dats/pull/435) — complete project import.

A feature-heavy quarter. DATS gained sentence-level annotations as a first-class annotation type, and several new automatic analyses: document tag recommendations, quotation detection ("who says what to whom"), coreference resolution, and language identification. The import pipeline was completed for text, audio, and video (including tags, codes, annotations, and metadata), and PDF table extraction tooling was added. Timeline analysis was extended to annotations with database-cached results. On the infrastructure side, the Ray service was isolated, Gemma 3 became the default LLM/VLM, BLIP was removed, and SSO authentication was introduced.

---

## Q2 2025 (April – June)

**Theme:** Analysis exchange & visualization (ex/import, word cloud, whiteboard) and generative AI features

**Major contributions:**

- [Whiteboard (#523)](https://github.com/uhh-lt/dats/pull/523) — collaborative whiteboard feature.
- [Ex/import analysis (#534)](https://github.com/uhh-lt/dats/pull/534) — share and reuse analyses.
- [Memo generation (#542)](https://github.com/uhh-lt/dats/pull/542) — AI-generated memos.
- **DATS ATLAS** (later renamed to **Perspectives**) — interactive, aspect-focused document clustering with an interactive document map (initial development, no PR).

This quarter added new ways to visualize, exchange, and generate research artifacts. The whiteboard feature landed, analyses became exportable and importable, and a word cloud visualization was added. Generative AI was extended with automatic memo generation (via Ollama), and document tag recommendations were improved with better document embeddings. Document handling improved with a metadata importer (incl. Zotero/BibTeX conversion) and chunked import of large PDFs. The development setup was modernized by switching from conda to uv.

A major highlight was the start of **DATS ATLAS** (renamed to **Perspectives** in Q3 2025): an interactive document clustering extension. Its aspect-focused clustering pipeline combines LLM-driven document rewriting to emphasize user-defined aspects, instruction-steered embeddings, UMAP dimensionality reduction, and HDBSCAN clustering, with LLM-generated cluster titles and summaries. The initial backend (tables, DTOs, topic management jobs) and the first map-based dashboard UI were built in May–June 2025.

---

## Q3 2025 (July – September)

**Theme:** Large-scale architectural modernization — layered backend, RQ job system, folder management, and RAG chat

**Major contributions:**

- [Backend refactoring (#557)](https://github.com/uhh-lt/dats/pull/557) / [#558](https://github.com/uhh-lt/dats/pull/558) / [#559](https://github.com/uhh-lt/dats/pull/559) — reorganization into a clean layered architecture.
- [RQ job system (#563)](https://github.com/uhh-lt/dats/pull/563) — migration of background jobs to Redis Queue.
- [Folder management system (#554, #564)](https://github.com/uhh-lt/dats/pull/554) — hierarchical document organization.
- [RAG + LLM chat sessions (#549)](https://github.com/uhh-lt/dats/pull/549) — retrieval-augmented chat with project documents.
- [Classifier training (#613)](https://github.com/uhh-lt/dats/pull/613) — trainable classifiers for documents, sentences, and spans.
- **Perspectives** (renamed from DATS ATLAS) — the interactive document clustering feature got its final name, a reorganized codebase, and RQ-based jobs.

The most architecture-focused quarter in the project's history. The backend was restructured into a clean layered architecture (endpoints, services, repos, DTOs) with consistent naming, linting checks, and modern Python typing. The background job system was migrated to Redis Queue (RQ), including job migrations and moving the LLM assistant onto it. Documents can now be organized in a folder management system (backend + frontend). On the AI side, DATS gained RAG-based LLM chat sessions, interactive labeling, and trainable classifiers at document, sentence, and span level. The preprocessing pipeline was reworked into a configurable system with a health view, and Ollama was replaced by vLLM for model serving.

The **DATS ATLAS** feature started in Q2 was renamed to **Perspectives** (July 2025): topics became clusters, the code was reorganized into a dedicated module structure, and the perspective computation/refinement jobs were migrated to the new RQ job system.

---

## Q4 2025 (October – December)

**Theme:** Consolidation — faster PDF processing, perspectives improvements, and stability

**Major contribution:** [Docling serve (#639)](https://github.com/uhh-lt/dats/pull/639) — faster, simpler PDF conversion via an external Docling service.

A quieter consolidation quarter after the big Q3 refactor. PDF conversion was switched to Docling-serve, resulting in less code and faster conversion. The perspectives feature received improvements and bugfixes, classifier training memory usage was reduced by chunking long documents, and preprocessing recomputation became more robust with retries.

---

## Q1 2026 (January – March)

**Theme:** —

**Major contribution:** —

No pull requests were merged in this quarter. Development activity resumed in April 2026.

---

## Q2 2026 (April – June)

**Theme:** Frontend architecture modernization (TanStack Router), auto-annotation, and production hardening

**Major contributions:**

- [TanStack Router (#686)](https://github.com/uhh-lt/dats/pull/686) — complete frontend architecture rework with typesafe navigation.
- [Auto-annotate (#638)](https://github.com/uhh-lt/dats/pull/638) — automatic annotation feature.
- [Official DATS documentation (#682)](https://github.com/uhh-lt/dats/pull/682) — full project documentation.

After a quiet Q1, development resumed with a complete frontend architecture rework: the switch from react-router to TanStack Router brought typesafe navigation and typed URL params. The auto-annotate feature landed, along with an LLM assistant annotation refactoring. The platform was hardened for production with proper DB transaction handling, GlitchTip error tracking across backend, Ray, and frontend, and a refactored test suite. The official DATS documentation was published, and usability improvements for the tutorials were made.

---

## Q3 2026 (July – August)

**Theme:** Annotator UX polish and classifier improvements

**Major contributions:**

- [Code shortcuts (#696)](https://github.com/uhh-lt/dats/pull/696) — keyboard-driven rapid annotation.
- [Annotation resizing (#698)](https://github.com/uhh-lt/dats/pull/698) — resize span, sentence, and bbox annotations.
- [Bifrost integration (#685)](https://github.com/uhh-lt/dats/pull/685) — LLM gateway integration.

This quarter was dominated by annotator user-experience improvements: per-user, per-project code shortcuts bound to digit keys for rapid annotation, resizing of span/sentence/bbox annotations, memo indicators across all entity types, a reworked annotation toolbar, and aligned sentence & span annotator behavior with better highlighting and performance. The classifier system received several refinements, including a training-signal-strength indicator. The LLM assistant gained a new result step surfacing erroneous prompts and responses, Bifrost was integrated, multiple OIDC providers became configurable, and a "What's New" dialog based on GitHub release notes was added.

---

## The Two-Year Arc

1. **AI transformation (Q3 2024 → Q3 2026):** from the first LLM integration (#412) through RAG chat, classifiers, auto-annotation, and Bifrost — DATS became an AI-assisted annotation platform.
2. **Architectural modernization (Q4 2024 → Q2 2026):** search rewrite, layered backend, RQ jobs, isolated Ray services, and TanStack Router — sustained investment in performance and maintainability.
3. **UX maturation (Q2 2025 → Q3 2026):** whiteboard, word cloud, folder management, and finally the annotator UX overhaul with shortcuts, resizing, and memo indicators.
4. **Interactive document exploration (Q2 2025 → Q4 2025):** DATS ATLAS — later renamed Perspectives — introduced aspect-focused, LLM-driven document clustering with an interactive map, and was subsequently moved to the GPU worker and polished with better cluster naming.
