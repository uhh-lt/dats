# DATS — Major Contributions (Sep 2024 – Aug 2026)

Summary of merged pull requests in [uhh-lt/dats](https://github.com/uhh-lt/dats) between September 2024 and August 2026 (152 PRs total), grouped by theme.

## 🤖 AI / LLM Features (the biggest theme)

- **LLM integration** via Ollama (#412, #426), later **migrated to vLLM** (#604), with **Gemma 3** as default LLM/VLM (#512)
- **LLM Assistant** for document tagging (#412), moved to the RQ job system (#565), with a reworked result step showing erroneous prompts/responses (#706) and annotation refactoring (#647)
- **RAG + LLM chat sessions** (#549)
- **AI memo generation** (#542)
- **Bifrost integration** (#685)
- **Document tag recommendations** — new backend (#504), reworked (#518), improved with document embeddings (#537)
- **Annotation scaling** — ML-suggested annotation candidates, backend + frontend (#477, #479)
- **Classifier training** for document/sentence/span levels (#613), incl. memory reduction via chunking (#632), child-code training signals (#688), training-signal-strength dialog (#705), and further improvements (#707)
- **Auto-annotate** (#638) and **interactive labeling** (#550)
- **Quotation detection** ("who says what to whom") (#506), **coreference resolution** (#521), **language ID via GlotLID** (#520)

## ✍️ Annotation & Analysis

- **Sentence annotations** as a new annotation type (#481)
- **Bulk span annotation updates** (#422), jump-to-annotation (#437), annotation popover tree (#513)
- **Timeline analysis** for documents/span/sentence annotations with DB-cached results (#508, #517)
- **Word cloud** (#530), **export of analysis results** (#439), analysis ex-/import (#534)
- **Whiteboard** feature (#523, #556)
- **Perspectives** (COTA/prompt embedder) moved to GPU worker (#619) and improved (#643)
- Major **annotator UX work** (Aug 2026): code shortcuts 0–9 (#696, #708), annotation resizing for span/sentence/bbox (#698), memo indicators (#699), toolbar rework (#700), sentence/span annotator alignment + performance (#703)

## 🔍 Search & Document Management

- **Search system rewrite**: dynamic query builder joining only needed tables → big performance gains (#462); code search (#501), filter fixes (#447)
- **Similarity search refactoring** with generic vector-index service (#466); sentence-embedding reindex job (#552)
- **Folder management system** — backend (#554) + frontend (#564), integrated into search & annotator (#677)
- **Import rework** (#522): text/audio/video pipelines (#435), large-PDF chunking (#547), **PDF table extraction** (#485), **Docling-serve** for faster PDF conversion (#639), Zotero/BibTeX metadata importer (#543)
- **Preprocessing rework** — configurable pipelines (#568, #572), sdoc health view (#571)
- **BlockNote editor** for all memos (#454, #457)

## 🏗️ Architecture & Infrastructure

- **Backend restructuring**: layered architecture (repos/services/endpoints) (#557–#562), linting checks (#560), modern Python typing (#561), unified API logging (#623), DB transaction handling (#678)
- **Job system migration to RQ** (Redis Queue) (#563, #566)
- **Ray service isolation & refactoring** (#511, #617)
- **Frontend**: switch from react-router to **TanStack Router** for typesafe navigation (#686), query performance via normalized state (#498), sidebar tabs (#515), persistent tabs (#709)
- **Auth**: SSO / OIDC (#516) with multiple configurable providers (#690), password reset (#496), demo user (#423)
- **Ops**: backup scripts (#468), conda → uv (#531), GlitchTip error tracking (#681), "What's New" dialog from GitHub releases (#695), official documentation (#682), test suite rework (#428, #658)

---

**Headline narratives:**

1. The transformation of DATS into an **AI-assisted annotation platform** (LLM assistant, RAG chat, classifiers, auto-annotation, recommendation systems).
2. A **large-scale architectural modernization** (backend layering, RQ jobs, TanStack Router, isolated Ray services) that improved performance and maintainability.
