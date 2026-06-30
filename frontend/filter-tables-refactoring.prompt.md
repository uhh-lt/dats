## Plan: Dual-Mode Filter Tables for Analysis

Introduce a shared filter-state adapter for table toolbars/core tables where Redux and URL are both first-class state engines in core filtering. Then migrate sentence/span/bbox analysis views to URL-backed filter state (filter, expert mode, sorting, fetch size) while preserving Redux-backed table usage for dialog and other internal contexts. This avoids regressions in existing workflows and mirrors the existing ReduxFilterDialog/URLFilterDialog split with a table-level equivalent.

**Steps**

1. Phase 1 - Define dual-engine boundary in core/filter
   1.1 Create a mode-agnostic filter toolbar contract that supports either Redux-filter props or URL-filter props without forcing Redux types in all toolbar components.
   1.2 Refactor shared toolbar plumbing so table components can inject a filter adapter (Redux or URL) while preserving existing toolbar render extension points.
   1.3 Keep both engines active and supported in core/filter: Redux adapter and URL adapter must both remain maintained and testable.
   1.4 Keep current Redux behavior as the default adapter for legacy call sites during migration to prevent broad breakage. This phase blocks all later phases.
2. Phase 2 - Add URL search schemas for analysis routes (parallel across routes)
   2.1 Add `validateSearch` for sentence annotations route with defaults for `FILTER_PARAM`, `FILTER_EXPERT_MODE_PARAM`, `sortingModel`, `fetchSize`.
   2.2 Add the same schema shape for span annotations route.
   2.3 Add the same schema shape for bbox annotations route.
   2.4 Export route APIs for each feature view/hook layer (pattern match with existing route API modules).
   2.5 Verify schema defaults preserve current first-load behavior (same sorting/fetch size semantics as today).
3. Phase 3 - Build URL-based analysis table wrappers (parallel by feature after Phase 1+2)
   3.1 For sentence analysis wrapper, replace Redux connectors for filter/sorting/fetch-size with URL connectors; keep row selection and column visibility in Redux for now.
   3.2 Repeat same migration for span analysis wrapper.
   3.3 Repeat same migration for bbox analysis wrapper.
   3.4 Ensure wrapper components pass URL filter adapter props into table/toolbars while preserving existing bulk action hooks.
4. Phase 4 - Convert analysis toolbar-left components to URL filter dialog (parallel by feature)
   4.1 Replace ReduxFilterDialog usage with URLFilterDialog in sentence analysis toolbar-left.
   4.2 Replace ReduxFilterDialog usage with URLFilterDialog in span analysis toolbar-left.
   4.3 Replace ReduxFilterDialog usage with URLFilterDialog in bbox analysis toolbar-left.
   4.4 Keep toolbar button layout and bulk-action buttons unchanged.
5. Phase 5 - Preserve Redux-table use in dialog contexts
   5.1 Keep `SelectSentenceAnnotationsDialog` on Redux-capable table path (no URL coupling in dialogs).
   5.2 Ensure default/shared toolbar-left for dialog/internal contexts still supports Redux filter adapter.
   5.3 Confirm other dialog-driven table consumers continue to compile without route API dependency.
6. Phase 6 - Cleanups and compatibility hardening
   6.1 Remove obsolete feature-specific wiring duplication in analysis wrappers/toolbars once the URL path is validated, while keeping reusable Redux adapter support in core/filter.
   6.2 Ensure route navigation preserves URL state across tab switches and deep-link reloads.
   6.3 Document the dual-engine table-filter pattern in frontend architecture notes: engine selection rules, defaults, and examples for URL contexts vs Redux contexts.

**Relevant files**

- `/home/tfischer/Development/dwts/frontend/src/core/filter/toolbar/FilterTableToolbarProps.ts` - decouple toolbar props from Redux-only filter contract; introduce adapter-friendly props.
- `/home/tfischer/Development/dwts/frontend/src/core/filter/toolbar/useRenderToolbars.tsx` - refactor shared toolbar renderer plumbing to consume new filter adapter contract.
- `/home/tfischer/Development/dwts/frontend/src/core/filter/toolbar/FilterTableToolbarLeft.tsx` - keep default Redux toolbar behavior via explicit Redux adapter path.
- `/home/tfischer/Development/dwts/frontend/src/core/filter/filter-dialogs/ReduxFilterDialog.tsx` - retained for Redux mode (dialogs and legacy contexts).
- `/home/tfischer/Development/dwts/frontend/src/core/filter/filter-dialogs/URLFilterDialog.tsx` - URL mode dialog for analysis views.
- `/home/tfischer/Development/dwts/frontend/src/core/filter/filter-dialogs/URLFilterDialogProps.ts` - ensure route API typing aligns with analysis route APIs.
- `/home/tfischer/Development/dwts/frontend/src/core/sentence-annotation/table/SentenceAnnotationTable.tsx` - wire table to adapterized filter toolbar contract and URL-capable wrapper inputs.
- `/home/tfischer/Development/dwts/frontend/src/core/span-annotation/table/SpanAnnotationTable.tsx` - same migration shape as sentence.
- `/home/tfischer/Development/dwts/frontend/src/core/bbox-annotation/table/BBoxAnnotationTable.tsx` - same migration shape as sentence/span.
- `/home/tfischer/Development/dwts/frontend/src/features/sent-annotation-analysis/views/main/_components/SentAnnotationAnalysisTable.tsx` - move filter/sorting/fetch-size to URL state.
- `/home/tfischer/Development/dwts/frontend/src/features/span-annotation-analysis/views/main/_components/SpanAnnotationAnalysisTable.tsx` - move filter/sorting/fetch-size to URL state.
- `/home/tfischer/Development/dwts/frontend/src/features/bbox-annotation-analysis/views/main/_components/BBoxAnnotationAnalysisTable.tsx` - move filter/sorting/fetch-size to URL state.
- `/home/tfischer/Development/dwts/frontend/src/features/sent-annotation-analysis/views/main/_components/SentAnnotationAnalysisTableToolbarLeft.tsx` - switch to URLFilterDialog.
- `/home/tfischer/Development/dwts/frontend/src/features/span-annotation-analysis/views/main/_components/SpanAnnotationAnalysisTableToolbarLeft.tsx` - switch to URLFilterDialog.
- `/home/tfischer/Development/dwts/frontend/src/features/bbox-annotation-analysis/views/main/_components/toolbar/BBoxAnnotationAnalysisTableToolbarLeft.tsx` - switch to URLFilterDialog.
- `/home/tfischer/Development/dwts/frontend/src/features/sent-annotation-analysis/views/main/SentAnnotationAnalysisView.tsx` - consume route API search state.
- `/home/tfischer/Development/dwts/frontend/src/features/span-annotation-analysis/views/main/SpanAnnotationAnalysisView.tsx` - consume route API search state.
- `/home/tfischer/Development/dwts/frontend/src/features/bbox-annotation-analysis/views/main/BBoxAnnotationAnalysisView.tsx` - consume route API search state.
- `/home/tfischer/Development/dwts/frontend/src/routes/_auth/project/$projectId/analysis/sentence-annotations.tsx` - add `validateSearch` schema for URL table state.
- `/home/tfischer/Development/dwts/frontend/src/routes/_auth/project/$projectId/analysis/span-annotations.tsx` - add `validateSearch` schema for URL table state.
- `/home/tfischer/Development/dwts/frontend/src/routes/_auth/project/$projectId/analysis/bbox-annotations.tsx` - add `validateSearch` schema for URL table state.
- `/home/tfischer/Development/dwts/frontend/src/core/sentence-annotation/dialog/SelectSentenceAnnotationsDialog.tsx` - verify Redux table path remains unchanged and functional.

**Verification**

1. Run `npm run typecheck` in `/home/tfischer/Development/dwts/frontend` after each phase boundary.
2. Manual QA sentence analysis:
   2.1 Open sentence analysis, set complex filter + expert mode toggle + sorting + fetch size, refresh page, confirm state restoration from URL.
   2.2 Copy/share URL and open in new tab, confirm same table state.
   2.3 Run bulk actions; confirm selection logic unchanged.
3. Manual QA span analysis: repeat the same URL persistence/deep-link checks and bulk action checks.
4. Manual QA bbox analysis: repeat same checks including image preview column behavior.
5. Manual QA dialog workflows:
   5.1 Open SelectSentenceAnnotationsDialog (whiteboard and LLM assistant entry points), confirm Redux-backed filtering still works.
   5.2 Confirm dialog filtering is not polluted by route search params.

**Acceptance Criteria (Engine Parity)**

1. Core/filter exposes and supports two first-class engines: Redux engine and URL engine.
2. Filter dialog parity:
   2.1 ReduxFilterDialog and URLFilterDialog both support start edit, finish edit, reset, add/delete filter nodes, operator/column/value updates, and expert mode.
   2.2 Both dialogs render the same filter UI component contract with equivalent behavior for valid inputs.
3. Table toolbar parity:
   3.1 Shared toolbar contracts accept either Redux filter adapter props or URL filter adapter props.
   3.2 Default toolbar implementation remains Redux-capable for legacy and dialog contexts.
   3.3 Feature toolbars can opt into URL mode without requiring Redux filter props.
4. Analysis page behavior:
   4.1 Sentence, span, and bbox analysis routes use URL engine for filter + expert mode + sorting + fetch size.
   4.2 Deep link and refresh restore URL-backed state consistently.
5. Dialog/internal behavior:
   5.1 Dialog-based table flows (e.g., SelectSentenceAnnotationsDialog) remain Redux-capable and route-independent.
   5.2 No dialog flow requires route search params to function.
6. Compatibility and migration safety:
   6.1 Existing Redux-based consumers compile and run without URL route dependencies.
   6.2 URL-based consumers compile and run without Redux filter slice dependencies for filter persistence.
   6.3 Core/filter docs define clear engine selection rules and examples.

**Decisions**

- URL state scope is: filter + expert mode + sorting + fetch size.
- Rollout strategy is: shared abstraction first, then migrate all three analysis features.
- Analysis views default to URL-filter mode after migration, but core/filter keeps both URL and Redux engines available.
- Dialog-based table contexts remain Redux-capable.

**Further Considerations**

1. Scope choice already made: keep row selection and column visibility out of URL for now to avoid oversized URLs and brittle restoration semantics.
2. If later needed, add optional URL persistence for column visibility behind a compact serializer and explicit opt-in per feature.
3. Consider adding a small migration utility to clear stale legacy query params on first load for analysis routes.
