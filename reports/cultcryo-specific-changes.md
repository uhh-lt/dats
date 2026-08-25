# CultCryo-Specific Changes in DATS

This report documents all changes, features, and fixes in DATS that were driven by the **CultCryo project**, based on GitHub pull requests, issues, feature specs, and commit history (Sep 2024 – Aug 2026).

---

## Overview

| Date       | Artifact                                                                                 | Type                             | Status                                              |
| ---------- | ---------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| 2025-09-18 | [Issue #625 — COTA Refinements](https://github.com/uhh-lt/dats/issues/625)               | Feature ideas (workshop)         | Open                                                |
| 2025-12-09 | [PR #644 — Cultcryo bugfixing](https://github.com/uhh-lt/dats/pull/644)                  | Bugfix PR (22 commits, 53 files) | ✅ Merged                                           |
| 2026-02-12 | Feature specs (annoplot, chat-with-data, code-tag-versioning, complex-annotation-search) | Requirements docs                | Drafted                                             |
| 2026-02-12 | [Issue #655 — Complex Annotation Search](https://github.com/uhh-lt/dats/issues/655)      | Feature request                  | Open                                                |
| 2026-07-21 | [PR #692 — Cultcryo annotation features](https://github.com/uhh-lt/dats/pull/692)        | Feature PR                       | ❌ Closed unmerged (changes landed via #696 & #698) |

---

## 1. CultCryo Bugfixing — PR #644 (merged 2025-12-09)

A large hardening PR (+949/−259 lines across 53 files) that fixed bugs encountered by the CultCryo team during real project work. The commit history reveals four areas of fixes:

### Document processing & chunking

- `5c0ab394b` **Chunking for HTML and TXT** — added [html_chunking_utils.py](backend/src/modules/doc_processing/entrypoints/html_chunking_utils.py) (+275 lines) and [txt_chunking_utils.py](backend/src/modules/doc_processing/entrypoints/txt_chunking_utils.py) (+104 lines) so large HTML/text documents are split into chunks during import.
- `0b58b49f7` **Keep "formatting" of txt files** — plain-text files retain their line structure on import.
- `4da0da930` **Test conftest update** — tests no longer split pages into chunks.

### Memo system fixes

- `854478068` **Memo deletion fix** — resolved an issue when deleting memos.
- `fbe753f12` **Unstable memo hook** — fixed `useGetMemosAttachedObject` being unstable across renders (+47/−10 in [useGetMemosAttachedObject.ts](frontend/src/components/Memo/useGetMemosAttachedObject.ts)).
- `d741118c5` / `45c472f2f` **Memo rendering & reading** — memo content now renders correctly and reading memos was fixed.
- Backend memo endpoint adjustments in [memo_endpoint.py](backend/src/core/memo/memo_endpoint.py).

### Search & filtering fixes

- `f4ebf9c94` **Keyword filtering fix** — metadata filters now use LEFT OUTER JOIN instead of INNER JOIN in [search_builder.py](backend/src/systems/search_system/search_builder.py), so documents without metadata are no longer incorrectly excluded.
- `5e1928411` **Sorting bug in search view** — fixed table sorting in [SearchDocumentTable.tsx](frontend/src/views/search/DocumentSearch/SearchDocumentTable.tsx).
- `5e6548f61` / `c6cf92d56` **Filter operator typos** — fixed typos in filter operators.
- `9c497fb20` **Bag ordered set** — added a data structure required for correct ordering.

### Annotator & whiteboard fixes

- `1774fb0ad` **Whiteboard not interactable** — fixed whiteboard interaction.
- `3d1ad792f` **Removed virtualization from document renderer** — fixed rendering issues in long documents.
- `de7317783` / `7068fdfa6` **Code deletion & rendering** — improved code deletion handling and updated code rendering ([CodeIndicator.tsx](frontend/src/views/annotation/DocumentRenderer/CodeIndicator.tsx)).
- `48e1603ed` **User id 0 bug** — fixed an issue when providing 0 as a user id.
- `1ce5676ef` **Folder selection state** — fixed folder selection and state management.
- `a663fb5a1` / `5adfe8a95` **Code model cleanup** — renamed `mostRecentCode` → `mostRecentCodeId` and deleted the legacy `ICode` interface.
- Styling updates to the document renderer ([DocumentRenderer.css](frontend/src/views/annotation/DocumentRenderer/DocumentRenderer.css), +103/−45).

---

## 2. CultCryo Annotation Features — PR #692 (closed unmerged, 2026-08-12)

A feature branch (`cultcryo-annotation-features`) with two major annotation capabilities developed for CultCryo's weekly annotation workflow. The PR itself was closed unmerged because the two commits were split out and merged separately:

- `a0ea27ca8` **Code shortcuts** → merged as [#696](https://github.com/uhh-lt/dats/pull/696): per-user, per-project keyboard shortcuts binding codes to digit keys (0–9), with a management dialog ([CodeShortcutManagerDialog.tsx](frontend/src/features/annotation/code-shortcut/CodeShortcutManagerDialog.tsx), +217 lines) and a persisted Redux slice ([codeShortcutSlice.ts](frontend/src/features/annotation/store/codeShortcutSlice.ts), +112 lines).
- `e48c1f04e` **Resize annotations** → merged as [#698](https://github.com/uhh-lt/dats/pull/698): drag-to-resize for span, sentence, and bbox annotations, with a new hook ([useSpanAnnotationResize.ts](frontend/src/features/annotation/_hooks/useSpanAnnotationResize.ts), +181 lines) and backend DTO/endpoint support for span updates ([span_annotation_dto.py](backend/src/core/annotation/span_annotation_dto.py), +72 lines; +158 lines of new endpoint tests).

---

## 3. COTA Refinements — Issue #625 (open, from CultCryo workshop 2025-09-18)

Ideas collected at a **CultCryo workshop** for the COTA/perspectives feature:

- Color map by similarity or probability
- "Jump to document" button in the tooltip
- "Jump to selected sentence" in the table

Related follow-up work landed in [PR #643 — Perspectives improvements](https://github.com/uhh-lt/dats/pull/643) (2025-12-06), which included bugfixes and improved cluster naming/descriptions.

---

## 4. Feature Specs Driven by CultCryo (drafted 2026-02-12)

Four feature requirement documents were authored with CultCryo (and the Climate Change project) as the primary user, committed in `056abb10f`:

### Complex Annotation Search (Overlap Metrics) — [Issue #655](https://github.com/uhh-lt/dats/issues/655)

- **User story:** "As a CultCryo researcher who annotates weekly, I want to search for span annotations by overlap metric, so that I can identify co-occurring or nested concepts without exporting data or writing scripts."
- Overlap metrics: exact match, partial overlap, within, contains (half-open interval semantics).
- Filters: document IDs, code A/B, annotator; MAXQDA-inspired result visualization.
- Performance target: < 30 s on large corpora; success metric: 80% of overlap analyses done inside DATS within 4 weeks.
- Spec: [complex-annotation-search-requirements.md](specs/features/complex-annotation-search/complex-annotation-search-requirements.md)

### Annoplot

- **User story:** "As a qualitative researcher working on the Cult Cryo and Climate Change project, I want to visualize all annotations on a 2D map and edit them in bulk, so that I can quickly assess consistency and refine codes without rereading documents."
- A 2D embedding scatter plot of annotations colored by code, reusing Perspectives' dimensionality reduction, for annotation QA and bulk refinement.
- Spec: [annoplot-requirements.md](specs/features/annoplot/annoplot-requirements.md)

### Chat with Data

- Global chat over user-selected documents, annotations, and memos (scoped context injection, no RAG) to speed up interpretation.
- Spec: [chat-with-data-requirements.md](specs/features/chat-with-data/chat-with-data-requirements.md)

### Code/Tag Versioning & Audit Log

- Versioning of code/tag trees, an audit log of changes, and "outdated" warnings on annotations created under older code versions — addressing CultCryo's need to track code evolution during long-running annotation campaigns.
- Spec: [code-tag-versioning-requirements.md](specs/features/code-tag-versioning/code-tag-versioning-requirements.md)

---

## Summary

CultCryo's influence on DATS falls into three waves:

1. **Stabilization (Dec 2025):** PR #644 fixed ~15 concrete bugs the team hit in daily work — most notably document chunking for large HTML/TXT imports, memo handling, metadata filter joins in search, and annotator rendering.
2. **Workflow acceleration (Jul–Aug 2026):** code shortcuts and annotation resizing were built on the dedicated `cultcryo-annotation-features` branch and shipped via PRs #696/#698.
3. **Feature roadmap (Feb 2026 →):** four CultCryo-driven feature specs (complex overlap search, Annoplot, chat with data, code/tag versioning) plus COTA refinement ideas from the Sep 2025 workshop define the ongoing roadmap; the overlap search (#655) and COTA refinements (#625) are still open.
