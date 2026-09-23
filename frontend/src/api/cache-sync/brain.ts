import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import type { DATSEvent } from "@models/datsEvents";
import { SearchEntityType } from "@models/SearchEntityType";
import type { UserRead } from "@models/UserRead";
import {
  appendListItem,
  removeListItem,
  removeMapItem,
  removeSingle,
  replaceListItem,
  setSingle,
  sweepPrefix,
  upsertMapItem,
} from "./_utils/cacheWriterUtils";
import { writeJobUpdate } from "./_utils/jobCacheUtils";
import {
  appendMemo,
  invalidateAttachedObjectMemoIds,
  invalidateMemoRecents,
  invalidateMemoWorkspace,
  removeMemo,
  writeMemo,
} from "./_utils/memoCacheUtils";
import { removeSentenceAnnotation, upsertSentenceAnnotation } from "./_utils/sentenceAnnoCacheUtils";

export type DATSEventSource = "mutation" | "websocket";

// ── The brain ────────────────────────────────────────────────────────────────

/**
 * Central cache-update brain. Every DATS event — whether it arrived as a
 * mutation response or a websocket push — is handled here exactly once.
 * The event contract is the generated `DATSEvent` union (see
 * src/models/datsEvents.ts); the backend emits the same DTO that the mutation
 * endpoint returns, so one handler serves both sources.
 *
 * Caches are written directly (zero refetch); derived/search/statistics
 * caches are invalidated. The `source` is currently only used for debugging.
 */
export function handleDATSEvent(event: DATSEvent, source: DATSEventSource): void {
  void source;
  switch (event.type) {
    // ── Jobs ──────────────────────────────────────────────────────────────
    case "JOB_UPDATED":
      writeJobUpdate(event.payload);
      break;

    // ── Codes ─────────────────────────────────────────────────────────────
    case "CODE_CREATED":
      upsertMapItem([QueryKey.PROJECT_CODES, event.payload.project_id], event.payload);
      break;
    case "CODE_UPDATED":
      upsertMapItem([QueryKey.PROJECT_CODES, event.payload.project_id], event.payload);
      break;
    case "CODE_DELETED": {
      const code = event.payload;
      removeMapItem([QueryKey.PROJECT_CODES, code.project_id], code.id);
      // Deleting a code cascades to its annotations in the DB, which the
      // frontend cannot observe directly — invalidate annotation queries.
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, code.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_ENTITY_STATISTICS, code.id] });
      break;
    }

    // ── Tags ──────────────────────────────────────────────────────────────
    case "TAG_CREATED":
      appendListItem([QueryKey.PROJECT_TAGS, event.payload.project_id], event.payload);
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
      break;
    case "TAG_UPDATED":
      replaceListItem([QueryKey.PROJECT_TAGS, event.payload.project_id], event.payload);
      break;
    case "TAG_DELETED": {
      const tag = event.payload;
      // Sweep the tag out of every cached per-sdoc tag list.
      sweepPrefix<number[]>([QueryKey.SDOC_TAGS], (old) => (old ? old.filter((tagId) => tagId !== tag.id) : old));
      removeListItem([QueryKey.PROJECT_TAGS, tag.project_id], tag.id);
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
      break;
    }

    // ── Memos ─────────────────────────────────────────────────────────────
    case "MEMO_CREATED":
      appendMemo(event.payload);
      invalidateAttachedObjectMemoIds(event.payload.attached_object_type, event.payload.attached_object_id);
      invalidateMemoWorkspace();
      break;
    case "MEMO_UPDATED":
      writeMemo(event.payload);
      invalidateMemoWorkspace();
      break;
    case "MEMO_UPDATED_BATCH":
      event.payload.forEach(writeMemo);
      invalidateMemoWorkspace();
      break;
    case "MEMO_DELETED":
      removeMemo(event.payload);
      invalidateMemoWorkspace();
      invalidateMemoRecents([event.payload.project_id]);
      break;
    case "MEMO_DELETED_BATCH":
      event.payload.forEach(removeMemo);
      invalidateMemoWorkspace();
      invalidateMemoRecents(event.payload.map((memo) => memo.project_id));
      break;

    // ── Whiteboards ─────────────────────────────────────────────────────────
    case "WHITEBOARD_CREATED":
    case "WHITEBOARD_UPDATED":
      upsertMapItem([QueryKey.PROJECT_WHITEBOARDS, event.payload.project_id], event.payload);
      break;
    case "WHITEBOARD_DELETED":
      removeMapItem([QueryKey.PROJECT_WHITEBOARDS, event.payload.project_id], event.payload.id);
      break;

    // ── Timeline analyses ───────────────────────────────────────────────────
    case "TIMELINE_ANALYSIS_CREATED":
    case "TIMELINE_ANALYSIS_UPDATED":
      upsertMapItem([QueryKey.PROJECT_TIMELINE_ANALYSIS, event.payload.project_id], event.payload);
      break;
    case "TIMELINE_ANALYSIS_DELETED":
      removeMapItem([QueryKey.PROJECT_TIMELINE_ANALYSIS, event.payload.project_id], event.payload.id);
      break;

    // ── Concept-over-time analyses ──────────────────────────────────────────
    case "COTA_CREATED":
    case "COTA_UPDATED":
      upsertMapItem([QueryKey.PROJECT_COTAS, event.payload.project_id], event.payload);
      break;
    case "COTA_DELETED":
      removeMapItem([QueryKey.PROJECT_COTAS, event.payload.project_id], event.payload.id);
      break;

    // ── Folders ─────────────────────────────────────────────────────────────
    case "FOLDER_CREATED":
    case "FOLDER_UPDATED":
      upsertMapItem([QueryKey.PROJECT_FOLDERS, event.payload.project_id, event.payload.folder_type], event.payload);
      break;
    case "FOLDER_UPDATED_BATCH":
      event.payload.forEach((folder) => {
        upsertMapItem([QueryKey.PROJECT_FOLDERS, folder.project_id, folder.folder_type], folder);
      });
      break;
    case "FOLDER_DELETED":
      removeMapItem([QueryKey.PROJECT_FOLDERS, event.payload.project_id, event.payload.folder_type], event.payload.id);
      break;

    // ── Project metadata ────────────────────────────────────────────────────
    case "PROJECT_METADATA_CREATED":
      upsertMapItem([QueryKey.PROJECT_METADATAS, event.payload.project_id], event.payload);
      // New metadata key → sdoc metadata + table info queries may change.
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE_INFO] });
      break;
    case "PROJECT_METADATA_UPDATED":
      upsertMapItem([QueryKey.PROJECT_METADATAS, event.payload.project_id], event.payload);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] });
      break;
    case "PROJECT_METADATA_DELETED": {
      const metadata = event.payload;
      removeMapItem([QueryKey.PROJECT_METADATAS, metadata.project_id], metadata.id);
      // Sweep the deleted metadata key out of every per-sdoc metadata map.
      sweepPrefix<Record<number, unknown>>([QueryKey.SDOC_METADATAS], (old) => {
        if (!old) return old;
        const next = { ...old };
        delete next[metadata.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE_INFO] });
      break;
    }

    // ── Classifiers ─────────────────────────────────────────────────────────
    // (No CLASSIFIER_CREATED — creation is job-driven; the list refreshes when
    // the classifier job finishes.)
    case "CLASSIFIER_UPDATED":
      upsertMapItem([QueryKey.PROJECT_CLASSIFIERS, event.payload.project_id], event.payload);
      break;
    case "CLASSIFIER_DELETED":
      removeMapItem([QueryKey.PROJECT_CLASSIFIERS, event.payload.project_id], event.payload.id);
      break;

    // ── Aspects (perspectives) ──────────────────────────────────────────────
    case "ASPECT_CREATED":
    case "ASPECT_UPDATED":
      upsertMapItem([QueryKey.PROJECT_ASPECTS, event.payload.project_id], event.payload);
      break;
    case "ASPECT_DELETED":
      removeMapItem([QueryKey.PROJECT_ASPECTS, event.payload.project_id], event.payload.id);
      break;

    // ── Projects ────────────────────────────────────────────────────────────
    case "PROJECT_CREATED":
      appendListItem([QueryKey.USER_PROJECTS], event.payload);
      break;
    case "PROJECT_UPDATED":
      replaceListItem([QueryKey.USER_PROJECTS], event.payload);
      break;
    case "PROJECT_DELETED":
      removeListItem([QueryKey.USER_PROJECTS], event.payload.id);
      break;

    // ── Users ───────────────────────────────────────────────────────────────
    case "USER_UPDATED":
      sweepPrefix<UserRead[]>([QueryKey.PROJECT_USERS], (old) =>
        old ? old.map((user) => (user.id === event.payload.id ? event.payload : user)) : old,
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.ME] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_ANNOTATORS] });
      break;
    case "USER_DELETED":
      sweepPrefix<UserRead[]>([QueryKey.PROJECT_USERS], (old) =>
        old ? old.filter((user) => user.id !== event.payload.id) : old,
      );
      break;

    // ── API keys ────────────────────────────────────────────────────────────
    case "API_KEY_CREATED":
      appendListItem([QueryKey.USER_API_KEYS], event.payload);
      break;
    case "API_KEY_DELETED":
      removeListItem([QueryKey.USER_API_KEYS], event.payload.id);
      break;

    // ── Source documents ────────────────────────────────────────────────────
    case "SDOC_UPDATED":
      setSingle([QueryKey.SDOC, event.payload.id], event.payload);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case "SDOC_DELETED":
      removeSingle([QueryKey.SDOC, event.payload.id]);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;

    // ── Search views ────────────────────────────────────────────────────────
    case "SEARCH_VIEW_CREATED": {
      const view = event.payload;
      const viewKey = SEARCH_VIEW_QUERY_KEYS[view.entity_type as SearchEntityType];
      if (!viewKey) break;
      appendListItem([viewKey, view.entity_type, view.project_id], view);
      break;
    }
    case "SEARCH_VIEW_UPDATED": {
      const view = event.payload;
      const viewKey = SEARCH_VIEW_QUERY_KEYS[view.entity_type as SearchEntityType];
      if (!viewKey) break;
      replaceListItem([viewKey, view.entity_type, view.project_id], view);
      break;
    }
    case "SEARCH_VIEW_DELETED": {
      const view = event.payload;
      const viewKey = SEARCH_VIEW_QUERY_KEYS[view.entity_type as SearchEntityType];
      if (!viewKey) break;
      removeListItem([viewKey, view.entity_type, view.project_id], view.id);
      break;
    }
    case "SEARCH_VIEW_UPDATED_BATCH":
      event.payload.forEach((view) => {
        const viewKey = SEARCH_VIEW_QUERY_KEYS[view.entity_type as SearchEntityType];
        if (!viewKey) return;
        replaceListItem([viewKey, view.entity_type, view.project_id], view);
      });
      break;

    // ── Span annotations ────────────────────────────────────────────────────
    case "SPAN_ANNOTATION_CREATED": {
      const anno = event.payload;
      setSingle([QueryKey.SPAN_ANNOTATION, anno.id], anno);
      appendListItem([QueryKey.SDOC_SPAN_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, anno.code_id] });
      break;
    }
    case "SPAN_ANNOTATION_CREATED_BATCH": {
      const annos = event.payload;
      if (annos.length === 0) break;
      annos.forEach((anno) => setSingle([QueryKey.SPAN_ANNOTATION, anno.id], anno));
      // Bulk creates are always for one sdoc+user pair.
      const first = annos[0];
      annos.forEach((anno) => appendListItem([QueryKey.SDOC_SPAN_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno));
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, first.code_id] });
      break;
    }
    case "SPAN_ANNOTATION_UPDATED": {
      const anno = event.payload;
      setSingle([QueryKey.SPAN_ANNOTATION, anno.id], anno);
      replaceListItem([QueryKey.SDOC_SPAN_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, anno.code_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] });
      break;
    }
    case "SPAN_ANNOTATION_UPDATED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        setSingle([QueryKey.SPAN_ANNOTATION, anno.id], anno);
        replaceListItem([QueryKey.SDOC_SPAN_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno);
        queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, anno.code_id] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] });
      break;
    }
    case "SPAN_ANNOTATION_DELETED": {
      const anno = event.payload;
      removeSingle([QueryKey.SPAN_ANNOTATION, anno.id]);
      removeListItem([QueryKey.SDOC_SPAN_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno.id);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, anno.code_id] });
      break;
    }
    case "SPAN_ANNOTATION_DELETED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        removeSingle([QueryKey.SPAN_ANNOTATION, anno.id]);
        removeListItem([QueryKey.SDOC_SPAN_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno.id);
        queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, anno.code_id] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] });
      break;
    }

    // ── BBox annotations ────────────────────────────────────────────────────
    case "BBOX_ANNOTATION_CREATED": {
      const anno = event.payload;
      setSingle([QueryKey.BBOX_ANNOTATION, anno.id], anno);
      appendListItem([QueryKey.SDOC_BBOX_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno);
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, anno.code_id] });
      break;
    }
    case "BBOX_ANNOTATION_UPDATED": {
      const anno = event.payload;
      setSingle([QueryKey.BBOX_ANNOTATION, anno.id], anno);
      replaceListItem([QueryKey.SDOC_BBOX_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno);
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, anno.code_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_TABLE] });
      break;
    }
    case "BBOX_ANNOTATION_UPDATED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        setSingle([QueryKey.BBOX_ANNOTATION, anno.id], anno);
        replaceListItem([QueryKey.SDOC_BBOX_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno);
        queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, anno.code_id] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_TABLE] });
      break;
    }
    case "BBOX_ANNOTATION_DELETED": {
      const anno = event.payload;
      removeSingle([QueryKey.BBOX_ANNOTATION, anno.id]);
      removeListItem([QueryKey.SDOC_BBOX_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno.id);
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, anno.code_id] });
      break;
    }
    case "BBOX_ANNOTATION_DELETED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        removeSingle([QueryKey.BBOX_ANNOTATION, anno.id]);
        removeListItem([QueryKey.SDOC_BBOX_ANNOTATIONS, anno.sdoc_id, anno.user_id], anno.id);
        queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, anno.code_id] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_TABLE] });
      break;
    }

    // ── Sentence annotations ────────────────────────────────────────────────
    // The annotator cache groups annotations by sentence index, with each
    // annotation duplicated across every sentence it covers.
    case "SENTENCE_ANNOTATION_CREATED": {
      const anno = event.payload;
      setSingle([QueryKey.SENTENCE_ANNOTATION, anno.id], anno);
      upsertSentenceAnnotation(anno);
      break;
    }
    case "SENTENCE_ANNOTATION_CREATED_BATCH":
      event.payload.forEach((anno) => {
        setSingle([QueryKey.SENTENCE_ANNOTATION, anno.id], anno);
        upsertSentenceAnnotation(anno);
      });
      break;
    case "SENTENCE_ANNOTATION_UPDATED": {
      const anno = event.payload;
      setSingle([QueryKey.SENTENCE_ANNOTATION, anno.id], anno);
      upsertSentenceAnnotation(anno);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENT_ANNO_TABLE] });
      break;
    }
    case "SENTENCE_ANNOTATION_UPDATED_BATCH":
      event.payload.forEach((anno) => {
        setSingle([QueryKey.SENTENCE_ANNOTATION, anno.id], anno);
        upsertSentenceAnnotation(anno);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENT_ANNO_TABLE] });
      break;
    case "SENTENCE_ANNOTATION_DELETED": {
      const anno = event.payload;
      removeSingle([QueryKey.SENTENCE_ANNOTATION, anno.id]);
      removeSentenceAnnotation(anno);
      break;
    }
    case "SENTENCE_ANNOTATION_DELETED_BATCH":
      event.payload.forEach((anno) => {
        removeSingle([QueryKey.SENTENCE_ANNOTATION, anno.id]);
        removeSentenceAnnotation(anno);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENT_ANNO_TABLE] });
      break;

    // ── Span groups ─────────────────────────────────────────────────────────
    // Span groups have no dedicated query key — the annotation feature derives
    // them from the sdoc's span annotations (useComputeTokenData).
    case "SPAN_GROUP_CREATED":
    case "SPAN_GROUP_UPDATED":
    case "SPAN_GROUP_DELETED":
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, event.payload.sdoc_id] });
      break;

    // ── Source document tags ────────────────────────────────────────────────
    // The payload carries the complete new tag list per sdoc — write it
    // directly. Tag-count aggregates cannot be derived from the links, so
    // those are invalidated.
    case "SDOC_TAGS_LINKED":
      Object.entries(event.payload.links).forEach(([sdocId, tagIds]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, Number(sdocId)], tagIds);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      break;

    // ── Source document metadata ────────────────────────────────────────────
    case "SDOC_METADATA_UPDATED":
    case "SDOC_METADATA_DELETED":
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, event.payload.source_document_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA_BY_KEY, event.payload.source_document_id] });
      break;
    case "SDOC_METADATA_UPDATED_BATCH":
      event.payload.forEach((metadata) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA_BY_KEY, metadata.source_document_id] });
      });
      break;

    // ── Tag recommendations ─────────────────────────────────────────────────
    // Reviewed recommendations are grouped by their ML job; refresh those lists.
    case "TAG_RECOMMENDATION_REVIEWED_BATCH": {
      const mlJobIds = new Set(event.payload.map((link) => link.ml_job_id));
      mlJobIds.forEach((mlJobId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_RECOMMENDATIONS, mlJobId] });
      });
      break;
    }

    // ── Project membership ──────────────────────────────────────────────────
    // The payload carries the complete resulting member list — write it
    // directly into the project-keyed user list.
    case "PROJECT_USERS_LINKED":
      queryClient.setQueryData<UserRead[]>([QueryKey.PROJECT_USERS, event.payload.project_id], event.payload.users);
      break;

    default: {
      console.warn("Unhandled dats event");
    }
  }
}

// Each entity's views live under their own query key; the payload's entity_type
// selects which one to write into.
const SEARCH_VIEW_QUERY_KEYS: Record<SearchEntityType, (typeof QueryKey)[keyof typeof QueryKey]> = {
  [SearchEntityType.MEMO]: QueryKey.MEMO_VIEWS,
  [SearchEntityType.SPAN_ANNOTATION]: QueryKey.SPAN_ANNO_VIEWS,
  [SearchEntityType.SENTENCE_ANNOTATION]: QueryKey.SENTENCE_ANNO_VIEWS,
  [SearchEntityType.BBOX_ANNOTATION]: QueryKey.BBOX_ANNO_VIEWS,
};
