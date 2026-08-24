import { SearchViewBase } from "@api/hooks/SearchViewHooks";
import { MyFilter } from "@core/filter";
import { DateGranularity } from "@models/DateGranularity";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { SortDirection } from "@models/SortDirection";
// Memo
import { GroupConfig_MemoColumns_ } from "@models/GroupConfig_MemoColumns_";
import { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRow } from "@models/MemoRow";
import { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import { MemoSearchViewUpdate } from "@models/MemoSearchViewUpdate";
import { Page_MemoRow_ } from "@models/Page_MemoRow_";
import { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import { Sort_MemoColumns_ } from "@models/Sort_MemoColumns_";
// Span annotation
import { GroupConfig_SpanColumns_ } from "@models/GroupConfig_SpanColumns_";
import { GroupQueryRequest_SpanColumns_ } from "@models/GroupQueryRequest_SpanColumns_";
import { Page_SpanAnnotationRow_ } from "@models/Page_SpanAnnotationRow_";
import { QueryRequest_SpanColumns_ } from "@models/QueryRequest_SpanColumns_";
import { Sort_SpanColumns_ } from "@models/Sort_SpanColumns_";
import { SpanAnnotationRow } from "@models/SpanAnnotationRow";
import { SpanColumns } from "@models/SpanColumns";
import { SpanSearchViewRead } from "@models/SpanSearchViewRead";
import { SpanSearchViewUpdate } from "@models/SpanSearchViewUpdate";
// Sentence annotation
import { GroupConfig_SentAnnoColumns_ } from "@models/GroupConfig_SentAnnoColumns_";
import { GroupQueryRequest_SentAnnoColumns_ } from "@models/GroupQueryRequest_SentAnnoColumns_";
import { Page_SentenceAnnotationRow_ } from "@models/Page_SentenceAnnotationRow_";
import { QueryRequest_SentAnnoColumns_ } from "@models/QueryRequest_SentAnnoColumns_";
import { SentAnnoColumns } from "@models/SentAnnoColumns";
import { SentenceAnnotationRow } from "@models/SentenceAnnotationRow";
import { SentenceSearchViewRead } from "@models/SentenceSearchViewRead";
import { SentenceSearchViewUpdate } from "@models/SentenceSearchViewUpdate";
import { Sort_SentAnnoColumns_ } from "@models/Sort_SentAnnoColumns_";
// BBox annotation
import { BBoxAnnotationRow } from "@models/BBoxAnnotationRow";
import { BBoxColumns } from "@models/BBoxColumns";
import { BBoxSearchViewRead } from "@models/BBoxSearchViewRead";
import { BBoxSearchViewUpdate } from "@models/BBoxSearchViewUpdate";
import { GroupConfig_BBoxColumns_ } from "@models/GroupConfig_BBoxColumns_";
import { GroupQueryRequest_BBoxColumns_ } from "@models/GroupQueryRequest_BBoxColumns_";
import { Page_BBoxAnnotationRow_ } from "@models/Page_BBoxAnnotationRow_";
import { QueryRequest_BBoxColumns_ } from "@models/QueryRequest_BBoxColumns_";
import { Sort_BBoxColumns_ } from "@models/Sort_BBoxColumns_";

/**
 * Generic structural mirrors of the generated `*_<Columns>` OpenAPI types.
 *
 * The backend emits one concrete type per entity (e.g. `QueryRequest_MemoColumns_`,
 * `MemoSearchViewRead`). These generics capture the shared shape so the workspace
 * layer can stay entity-agnostic.
 *
 * IMPORTANT: These are hand-written mirrors, NOT derived from the generated types,
 * so TypeScript's structural typing will NOT flag drift on its own. The
 * `AssertEqual` checks at the bottom of this file turn any divergence (field
 * added/removed/renamed in the generated code) into a compile error. When you
 * regenerate the API client and the build breaks here, update the mirror to match.
 */

/** Generic structural mirror of the generated `QueryRequest_<Columns>` types. */
export interface WorkspaceQueryRequest<TColumns extends string> {
  project_id: number;
  search_query?: string;
  filter: MyFilter<TColumns>;
  sorts?: WorkspaceSort<TColumns>[];
  group_by?: WorkspaceGroupConfig<TColumns> | null;
  group_key?: string | null;
  page_number?: number;
  page_size?: number;
}

/** Generic structural mirror of `GroupQueryRequest_<Columns>`. */
export interface WorkspaceGroupQueryRequest<TColumns extends string> {
  project_id: number;
  search_query?: string;
  filter: MyFilter<TColumns>;
  group_by: WorkspaceGroupConfig<TColumns>;
  page_number?: number;
  page_size?: number;
}

/** Generic structural mirror of `Sort_<Columns>`. */
export interface WorkspaceSort<TColumns extends string> {
  column: TColumns | number;
  direction: SortDirection;
}

/** Generic structural mirror of `GroupConfig_<Columns>`. */
export interface WorkspaceGroupConfig<TColumns extends string> {
  field: TColumns;
  date_granularity?: DateGranularity | null;
}

/** Generic structural mirror of `Page_<Row>`. */
export interface WorkspacePage<TRow> {
  items: TRow[];
  total_results: number;
}

/**
 * Generic structural mirror of the generated `<Entity>SearchViewRead` types.
 * `filters` is the read (output) filter tree; updates accept the same shape.
 */
export interface WorkspaceView<TColumns extends string> extends SearchViewBase {
  name: string;
  layout: SearchViewLayout;
  filters: MyFilter<TColumns>;
  group_by?: WorkspaceGroupConfig<TColumns> | null;
  sorts?: WorkspaceSort<TColumns>[];
  selected_properties?: TColumns[] | null;
  user_id: number;
  created: string;
  updated: string;
}

/** Generic structural mirror of `<Entity>SearchViewUpdate`. */
export interface WorkspaceViewUpdate<TColumns extends string> {
  name?: string | null;
  layout?: SearchViewLayout | null;
  filters?: MyFilter<TColumns> | null;
  group_by?: WorkspaceGroupConfig<TColumns> | null;
  sorts?: WorkspaceSort<TColumns>[] | null;
  selected_properties?: TColumns[] | null;
}

/**
 * Compile-time equality check: `true` only when `A` and `B` are mutually
 * assignable. Used below to guarantee a mirror stays in sync with its generated
 * counterpart. If the backend schema changes, the matching line fails to compile.
 */
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

/**
 * Drift guards (regenerate the API client -> these fail to compile if a mirror
 * diverges from its generated counterpart). Exported so `noUnusedLocals` ignores
 * them; they exist purely for the type checker and tree-shake away at build time.
 *
 * One block per entity that has a search workspace (memo, span, sentence, bbox).
 */
// Memo
export const _checkMemoQueryRequest: AssertEqual<QueryRequest_MemoColumns_, WorkspaceQueryRequest<MemoColumns>> = true;
export const _checkMemoGroupQueryRequest: AssertEqual<
  GroupQueryRequest_MemoColumns_,
  WorkspaceGroupQueryRequest<MemoColumns>
> = true;
export const _checkMemoSort: AssertEqual<Sort_MemoColumns_, WorkspaceSort<MemoColumns>> = true;
export const _checkMemoGroupConfig: AssertEqual<GroupConfig_MemoColumns_, WorkspaceGroupConfig<MemoColumns>> = true;
export const _checkMemoPage: AssertEqual<Page_MemoRow_, WorkspacePage<MemoRow>> = true;
export const _checkMemoView: AssertEqual<MemoSearchViewRead, WorkspaceView<MemoColumns>> = true;
export const _checkMemoViewUpdate: AssertEqual<MemoSearchViewUpdate, WorkspaceViewUpdate<MemoColumns>> = true;

// Span annotation
export const _checkSpanQueryRequest: AssertEqual<QueryRequest_SpanColumns_, WorkspaceQueryRequest<SpanColumns>> = true;
export const _checkSpanGroupQueryRequest: AssertEqual<
  GroupQueryRequest_SpanColumns_,
  WorkspaceGroupQueryRequest<SpanColumns>
> = true;
export const _checkSpanSort: AssertEqual<Sort_SpanColumns_, WorkspaceSort<SpanColumns>> = true;
export const _checkSpanGroupConfig: AssertEqual<GroupConfig_SpanColumns_, WorkspaceGroupConfig<SpanColumns>> = true;
export const _checkSpanPage: AssertEqual<Page_SpanAnnotationRow_, WorkspacePage<SpanAnnotationRow>> = true;
export const _checkSpanView: AssertEqual<SpanSearchViewRead, WorkspaceView<SpanColumns>> = true;
export const _checkSpanViewUpdate: AssertEqual<SpanSearchViewUpdate, WorkspaceViewUpdate<SpanColumns>> = true;

// Sentence annotation
export const _checkSentQueryRequest: AssertEqual<
  QueryRequest_SentAnnoColumns_,
  WorkspaceQueryRequest<SentAnnoColumns>
> = true;
export const _checkSentGroupQueryRequest: AssertEqual<
  GroupQueryRequest_SentAnnoColumns_,
  WorkspaceGroupQueryRequest<SentAnnoColumns>
> = true;
export const _checkSentSort: AssertEqual<Sort_SentAnnoColumns_, WorkspaceSort<SentAnnoColumns>> = true;
export const _checkSentGroupConfig: AssertEqual<
  GroupConfig_SentAnnoColumns_,
  WorkspaceGroupConfig<SentAnnoColumns>
> = true;
export const _checkSentPage: AssertEqual<Page_SentenceAnnotationRow_, WorkspacePage<SentenceAnnotationRow>> = true;
export const _checkSentView: AssertEqual<SentenceSearchViewRead, WorkspaceView<SentAnnoColumns>> = true;
export const _checkSentViewUpdate: AssertEqual<SentenceSearchViewUpdate, WorkspaceViewUpdate<SentAnnoColumns>> = true;

// BBox annotation
export const _checkBBoxQueryRequest: AssertEqual<QueryRequest_BBoxColumns_, WorkspaceQueryRequest<BBoxColumns>> = true;
export const _checkBBoxGroupQueryRequest: AssertEqual<
  GroupQueryRequest_BBoxColumns_,
  WorkspaceGroupQueryRequest<BBoxColumns>
> = true;
export const _checkBBoxSort: AssertEqual<Sort_BBoxColumns_, WorkspaceSort<BBoxColumns>> = true;
export const _checkBBoxGroupConfig: AssertEqual<GroupConfig_BBoxColumns_, WorkspaceGroupConfig<BBoxColumns>> = true;
export const _checkBBoxPage: AssertEqual<Page_BBoxAnnotationRow_, WorkspacePage<BBoxAnnotationRow>> = true;
export const _checkBBoxView: AssertEqual<BBoxSearchViewRead, WorkspaceView<BBoxColumns>> = true;
export const _checkBBoxViewUpdate: AssertEqual<BBoxSearchViewUpdate, WorkspaceViewUpdate<BBoxColumns>> = true;
