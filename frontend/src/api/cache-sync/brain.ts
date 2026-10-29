import { queryClient } from "@api/queryClient";
import { statisticsQueries } from "@api/statistics/statisticsQueries";
import { agreementQueries } from "@features/agreement-analysis/api/agreementQueries";
import { bboxAnnotationQueries } from "@core/bbox-annotation/api/bboxAnnotationQueries";
import { codeQueries } from "@core/code/api/codeQueries";
import { tableInfoQueries } from "@core/filter/api/tableInfoQueries";
import { folderQueries } from "@core/folder/api/folderQueries";
import { projectMetadataQueries } from "@core/project-metadata/api/projectMetadataQueries";
import { projectQueries } from "@core/project/api/projectQueries";
import { promptTemplateQueries } from "@core/prompt-template/api/promptTemplateQueries";
import { sdocMetadataQueries } from "@core/sdoc-metadata/api/sdocMetadataQueries";
import { sentenceAnnotationQueries } from "@core/sentence-annotation/api/sentenceAnnotationQueries";
import { sdocQueries } from "@core/source-document/api/sdocQueries";
import { spanAnnotationQueries } from "@core/span-annotation/api/spanAnnotationQueries";
import { tagQueries } from "@core/tag/api/tagQueries";
import { userQueries } from "@core/user/api/userQueries";
import { searchViewQueries } from "@core/workspace/api/searchViewQueries";
import { classifierQueries } from "@features/classifier/api/classifierQueries";
import { cotaQueries } from "@features/concept-over-time-analysis/api/cotaQueries";
import { perspectivesQueries } from "@features/perspectives/api/perspectivesQueries";
import { apiKeyQueries } from "@features/profile/api/apiKeyQueries";
import { tagRecommendationQueries } from "@features/tag-recommendations/api/tagRecommendationQueries";
import { timelineAnalysisQueries } from "@features/timeline-analysis/api/timelineAnalysisQueries";
import { whiteboardQueries } from "@features/whiteboard/api/whiteboardQueries";
import type { ApiKeyRead } from "@models/ApiKeyRead";
import { AttachedObjectType } from "@models/AttachedObjectType";
import type { ClusterRead } from "@models/ClusterRead";
import type { DATSEvent } from "@models/datsEvents";
import type { FolderRead } from "@models/FolderRead";
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
import { handleJobUpdate } from "./_utils/jobCacheUtils";
import {
  appendMemo,
  invalidateAttachedObjectMemoIds,
  invalidateCopiedAnnotationMemos,
  invalidateMemoRecents,
  invalidateMemoWorkspace,
  removeMemo,
  writeMemo,
} from "./_utils/memoCacheUtils";
import { removeSdocMetadata, upsertSdocMetadata } from "./_utils/sdocMetadataCacheUtils";
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
  // Agreement results are computed from span and sentence annotations. They are only marked
  // as outdated, not refetched, so that the listed segments do not change while being reviewed.
  if (event.type.startsWith("SPAN_ANNOTATION_") || event.type.startsWith("SENTENCE_ANNOTATION_")) {
    queryClient.invalidateQueries({ queryKey: agreementQueries.computeScope(), refetchType: "none" });
  }
  switch (event.type) {
    // ── Jobs ──────────────────────────────────────────────────────────────
    case "JOB_UPDATED":
      handleJobUpdate(event.payload);
      break;

    // ── Codes ─────────────────────────────────────────────────────────────
    case "CODE_CREATED":
      upsertMapItem(codeQueries.byProject(event.payload.project_id).queryKey, event.payload);
      break;
    case "CODE_UPDATED": {
      const code = event.payload;
      const queryKey = codeQueries.byProject(code.project_id).queryKey;
      // Read the previous value before writing to detect an `enabled` flip.
      const previous = queryClient.getQueryData(queryKey)?.[code.id];
      upsertMapItem(queryKey, code);
      // Enabling/disabling a code cascades to its ancestors in the DB, which the
      // single CodeRead payload cannot capture — refetch all codes on a flip.
      if (previous && previous.enabled !== code.enabled) {
        queryClient.invalidateQueries({ queryKey });
      }
      break;
    }
    case "CODE_DELETED": {
      const code = event.payload;
      removeMapItem(codeQueries.byProject(code.project_id).queryKey, code.id);
      // Deleting a code cascades to its annotations in the DB, which the
      // frontend cannot observe directly — invalidate annotation queries.
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.all() });
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.all() });
      queryClient.invalidateQueries({ queryKey: sentenceAnnotationQueries.all() });
      queryClient.invalidateQueries({ queryKey: whiteboardQueries.byProject(code.project_id).queryKey });
      queryClient.invalidateQueries({ queryKey: statisticsQueries.codeStatsOfCodeScope(code.id) });
      break;
    }

    // ── Tags ──────────────────────────────────────────────────────────────
    case "TAG_CREATED":
      appendListItem(tagQueries.byProject(event.payload.project_id).queryKey, event.payload);
      queryClient.invalidateQueries({ queryKey: tagQueries.sdocCountScope() });
      break;
    case "TAG_UPDATED":
      replaceListItem(tagQueries.byProject(event.payload.project_id).queryKey, event.payload);
      break;
    case "TAG_DELETED": {
      const tag = event.payload;
      // Sweep the tag out of every cached per-sdoc tag list.
      sweepPrefix<number[]>(tagQueries.idsBySdocScope(), (old) =>
        old ? old.filter((tagId) => tagId !== tag.id) : old,
      );
      removeListItem(tagQueries.byProject(tag.project_id).queryKey, tag.id);
      queryClient.invalidateQueries({ queryKey: tagQueries.sdocCountScope() });
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
      upsertMapItem(whiteboardQueries.byProject(event.payload.project_id).queryKey, event.payload);
      break;
    case "WHITEBOARD_DELETED":
      removeMapItem(whiteboardQueries.byProject(event.payload.project_id).queryKey, event.payload.id);
      break;

    // ── Timeline analyses ───────────────────────────────────────────────────
    case "TIMELINE_ANALYSIS_CREATED":
    case "TIMELINE_ANALYSIS_UPDATED":
      upsertMapItem(timelineAnalysisQueries.byProject(event.payload.project_id).queryKey, event.payload);
      break;
    case "TIMELINE_ANALYSIS_DELETED":
      removeMapItem(timelineAnalysisQueries.byProject(event.payload.project_id).queryKey, event.payload.id);
      break;

    // ── Concept-over-time analyses ──────────────────────────────────────────
    case "COTA_CREATED":
    case "COTA_UPDATED":
      upsertMapItem(cotaQueries.byProject(event.payload.project_id).queryKey, event.payload);
      break;
    case "COTA_DELETED":
      removeMapItem(cotaQueries.byProject(event.payload.project_id).queryKey, event.payload.id);
      break;

    // ── Prompt templates ────────────────────────────────────────────────────
    // A new version is an update of its template, whose payload lists all versions.
    case "PROMPT_TEMPLATE_CREATED":
    case "PROMPT_TEMPLATE_UPDATED":
      upsertMapItem(promptTemplateQueries.byProject(event.payload.project_id).queryKey, event.payload);
      break;

    // ── Folders ─────────────────────────────────────────────────────────────
    case "FOLDER_CREATED":
    case "FOLDER_UPDATED":
      upsertMapItem(
        folderQueries.byProject(event.payload.project_id, event.payload.folder_type).queryKey,
        event.payload,
      );
      break;
    case "FOLDER_UPDATED_BATCH": {
      // Read previous values before writing to detect actual moves (parent_id
      // changes). Only a move changes which sdocs are where → only then refresh
      // search results. Pure renames leave SEARCH_TABLE untouched.
      let anyMoved = false;
      event.payload.forEach((folder) => {
        const queryKey = folderQueries.byProject(folder.project_id, folder.folder_type).queryKey;
        const previous = queryClient.getQueryData<Record<number, FolderRead>>(queryKey)?.[folder.id];
        upsertMapItem(queryKey, folder);
        if (previous && previous.parent_id !== folder.parent_id) {
          anyMoved = true;
        }
      });
      if (anyMoved) {
        queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope() });
      }
      break;
    }
    case "FOLDER_DELETED":
      removeMapItem(
        folderQueries.byProject(event.payload.project_id, event.payload.folder_type).queryKey,
        event.payload.id,
      );
      break;
    case "FOLDER_DELETED_BATCH":
      event.payload.forEach((folder) =>
        removeMapItem(folderQueries.byProject(folder.project_id, folder.folder_type).queryKey, folder.id),
      );
      break;

    // ── Project metadata ────────────────────────────────────────────────────
    case "PROJECT_METADATA_CREATED":
      upsertMapItem(projectMetadataQueries.byProject(event.payload.project_id).queryKey, event.payload);
      // New metadata key → sdoc metadata + table info queries may change.
      queryClient.invalidateQueries({ queryKey: sdocMetadataQueries.bySdocScope() });
      queryClient.invalidateQueries({ queryKey: tableInfoQueries.all() });
      break;
    case "PROJECT_METADATA_UPDATED":
      upsertMapItem(projectMetadataQueries.byProject(event.payload.project_id).queryKey, event.payload);
      queryClient.invalidateQueries({ queryKey: sdocMetadataQueries.bySdocScope() });
      break;
    case "PROJECT_METADATA_DELETED": {
      const metadata = event.payload;
      removeMapItem(projectMetadataQueries.byProject(metadata.project_id).queryKey, metadata.id);
      // Sweep the deleted metadata key out of every per-sdoc metadata map.
      sweepPrefix<Record<number, unknown>>(sdocMetadataQueries.bySdocScope(), (old) => {
        if (!old) return old;
        const next = { ...old };
        delete next[metadata.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: tableInfoQueries.all() });
      break;
    }

    // ── Classifiers ─────────────────────────────────────────────────────────
    // (No CLASSIFIER_CREATED — creation is job-driven; the list refreshes when
    // the classifier job finishes.)
    case "CLASSIFIER_UPDATED":
      upsertMapItem(classifierQueries.byProject(event.payload.project_id).queryKey, event.payload);
      break;
    case "CLASSIFIER_DELETED":
      removeMapItem(classifierQueries.byProject(event.payload.project_id).queryKey, event.payload.id);
      break;

    // ── Aspects (perspectives) ──────────────────────────────────────────────
    case "ASPECT_CREATED":
    case "ASPECT_UPDATED":
      upsertMapItem(perspectivesQueries.aspectsByProject(event.payload.project_id).queryKey, event.payload);
      break;
    case "ASPECT_DELETED":
      removeMapItem(perspectivesQueries.aspectsByProject(event.payload.project_id).queryKey, event.payload.id);
      break;

    // ── Clusters (perspectives) ─────────────────────────────────────────────
    // The clusters of an sdoc are written; the visualizations show cluster
    // names and descriptions within derived data, so they are invalidated.
    case "CLUSTER_UPDATED": {
      const cluster = event.payload;
      sweepPrefix<ClusterRead[]>([...perspectivesQueries.clustersBySdocScope(), cluster.aspect_id], (old) =>
        old?.map((existing) => (existing.id === cluster.id ? cluster : existing)),
      );
      queryClient.invalidateQueries({ queryKey: perspectivesQueries.visualizationOfAspectScope(cluster.aspect_id) });
      break;
    }

    // ── Projects ────────────────────────────────────────────────────────────
    case "PROJECT_CREATED":
      appendListItem(projectQueries.userProjects().queryKey, event.payload);
      break;
    case "PROJECT_UPDATED":
      replaceListItem(projectQueries.userProjects().queryKey, event.payload);
      break;
    case "PROJECT_DELETED":
      removeListItem(projectQueries.userProjects().queryKey, event.payload.id);
      break;

    // ── Users ───────────────────────────────────────────────────────────────
    case "USER_UPDATED":
      sweepPrefix<UserRead[]>(userQueries.byProjectScope(), (old) =>
        old ? old.map((user) => (user.id === event.payload.id ? event.payload : user)) : old,
      );
      queryClient.invalidateQueries({ queryKey: userQueries.meScope() });
      queryClient.invalidateQueries({ queryKey: sdocQueries.annotatorsScope() });
      break;
    case "USER_DELETED":
      sweepPrefix<UserRead[]>(userQueries.byProjectScope(), (old) =>
        old ? old.filter((user) => user.id !== event.payload.id) : old,
      );
      break;

    // ── API keys ────────────────────────────────────────────────────────────
    case "API_KEY_CREATED": {
      // Strip the plaintext api_key: it must only live in the dialog state,
      // never in the shared query cache.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { api_key: _api_key, ...apiKeyRead } = event.payload as ApiKeyRead & {
        api_key?: string;
      };
      appendListItem(apiKeyQueries.list().queryKey, apiKeyRead);
      break;
    }
    case "API_KEY_DELETED":
      removeListItem(apiKeyQueries.list().queryKey, event.payload.id);
      break;

    // ── Source documents ────────────────────────────────────────────────────
    case "SDOC_UPDATED":
      setSingle(sdocQueries.byId(event.payload.id).queryKey, event.payload);
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope() });
      break;
    case "SDOC_DELETED":
      removeSingle(sdocQueries.byId(event.payload.id).queryKey);
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope() });
      break;
    case "SDOC_DELETED_BATCH":
      event.payload.forEach((sdoc) => removeSingle(sdocQueries.byId(sdoc.id).queryKey));
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope() });
      break;

    // ── Search views ────────────────────────────────────────────────────────
    case "SEARCH_VIEW_CREATED": {
      const view = event.payload;
      appendListItem(searchViewQueries.byProject(view.entity_type as SearchEntityType, view.project_id).queryKey, view);
      break;
    }
    case "SEARCH_VIEW_UPDATED": {
      const view = event.payload;
      replaceListItem(
        searchViewQueries.byProject(view.entity_type as SearchEntityType, view.project_id).queryKey,
        view,
      );
      break;
    }
    case "SEARCH_VIEW_DELETED": {
      const view = event.payload;
      removeListItem(
        searchViewQueries.byProject(view.entity_type as SearchEntityType, view.project_id).queryKey,
        view.id,
      );
      break;
    }
    case "SEARCH_VIEW_UPDATED_BATCH":
      event.payload.forEach((view) => {
        replaceListItem(
          searchViewQueries.byProject(view.entity_type as SearchEntityType, view.project_id).queryKey,
          view,
        );
      });
      break;

    // ── Span annotations ────────────────────────────────────────────────────
    case "SPAN_ANNOTATION_CREATED": {
      const anno = event.payload;
      setSingle(spanAnnotationQueries.byId(anno.id).queryKey, anno);
      appendListItem(spanAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno);
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.byUserCode(anno.code_id).queryKey });
      invalidateCopiedAnnotationMemos(AttachedObjectType.SPAN_ANNOTATION, [anno]);
      break;
    }
    case "SPAN_ANNOTATION_CREATED_BATCH": {
      const annos = event.payload;
      if (annos.length === 0) break;
      annos.forEach((anno) => setSingle(spanAnnotationQueries.byId(anno.id).queryKey, anno));
      // A batch can span several sdocs and codes (e.g. confirmed annoscaling suggestions).
      annos.forEach((anno) => appendListItem(spanAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno));
      new Set(annos.map((anno) => anno.code_id)).forEach((codeId) => {
        queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.byUserCode(codeId).queryKey });
      });
      invalidateCopiedAnnotationMemos(AttachedObjectType.SPAN_ANNOTATION, annos);
      break;
    }
    case "SPAN_ANNOTATION_UPDATED": {
      const anno = event.payload;
      setSingle(spanAnnotationQueries.byId(anno.id).queryKey, anno);
      replaceListItem(spanAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno);
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.byUserCode(anno.code_id).queryKey });
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.searchScope() });
      break;
    }
    case "SPAN_ANNOTATION_UPDATED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        setSingle(spanAnnotationQueries.byId(anno.id).queryKey, anno);
        replaceListItem(spanAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno);
        queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.byUserCode(anno.code_id).queryKey });
      });
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.searchScope() });
      break;
    }
    case "SPAN_ANNOTATION_DELETED": {
      const anno = event.payload;
      removeSingle(spanAnnotationQueries.byId(anno.id).queryKey);
      removeListItem(spanAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno.id);
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.byUserCode(anno.code_id).queryKey });
      break;
    }
    case "SPAN_ANNOTATION_DELETED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        removeSingle(spanAnnotationQueries.byId(anno.id).queryKey);
        removeListItem(spanAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno.id);
        queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.byUserCode(anno.code_id).queryKey });
      });
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.searchScope() });
      break;
    }

    // ── BBox annotations ────────────────────────────────────────────────────
    case "BBOX_ANNOTATION_CREATED": {
      const anno = event.payload;
      setSingle(bboxAnnotationQueries.byId(anno.id).queryKey, anno);
      appendListItem(bboxAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno);
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.byUserCode(anno.code_id).queryKey });
      invalidateCopiedAnnotationMemos(AttachedObjectType.BBOX_ANNOTATION, [anno]);
      break;
    }
    case "BBOX_ANNOTATION_UPDATED": {
      const anno = event.payload;
      setSingle(bboxAnnotationQueries.byId(anno.id).queryKey, anno);
      replaceListItem(bboxAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno);
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.byUserCode(anno.code_id).queryKey });
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.searchScope() });
      break;
    }
    case "BBOX_ANNOTATION_UPDATED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        setSingle(bboxAnnotationQueries.byId(anno.id).queryKey, anno);
        replaceListItem(bboxAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno);
        queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.byUserCode(anno.code_id).queryKey });
      });
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.searchScope() });
      break;
    }
    case "BBOX_ANNOTATION_DELETED": {
      const anno = event.payload;
      removeSingle(bboxAnnotationQueries.byId(anno.id).queryKey);
      removeListItem(bboxAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno.id);
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.byUserCode(anno.code_id).queryKey });
      break;
    }
    case "BBOX_ANNOTATION_DELETED_BATCH": {
      const annos = event.payload;
      annos.forEach((anno) => {
        removeSingle(bboxAnnotationQueries.byId(anno.id).queryKey);
        removeListItem(bboxAnnotationQueries.bySdoc(anno.sdoc_id, anno.user_id).queryKey, anno.id);
        queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.byUserCode(anno.code_id).queryKey });
      });
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.searchScope() });
      break;
    }

    // ── Sentence annotations ────────────────────────────────────────────────
    // The annotator cache groups annotations by sentence index, with each
    // annotation duplicated across every sentence it covers.
    case "SENTENCE_ANNOTATION_CREATED": {
      const anno = event.payload;
      setSingle(sentenceAnnotationQueries.byId(anno.id).queryKey, anno);
      upsertSentenceAnnotation(anno);
      invalidateCopiedAnnotationMemos(AttachedObjectType.SENTENCE_ANNOTATION, [anno]);
      break;
    }
    case "SENTENCE_ANNOTATION_CREATED_BATCH":
      event.payload.forEach((anno) => {
        setSingle(sentenceAnnotationQueries.byId(anno.id).queryKey, anno);
        upsertSentenceAnnotation(anno);
      });
      invalidateCopiedAnnotationMemos(AttachedObjectType.SENTENCE_ANNOTATION, event.payload);
      break;
    case "SENTENCE_ANNOTATION_UPDATED": {
      const anno = event.payload;
      setSingle(sentenceAnnotationQueries.byId(anno.id).queryKey, anno);
      upsertSentenceAnnotation(anno);
      queryClient.invalidateQueries({ queryKey: sentenceAnnotationQueries.searchScope() });
      break;
    }
    case "SENTENCE_ANNOTATION_UPDATED_BATCH":
      event.payload.forEach((anno) => {
        setSingle(sentenceAnnotationQueries.byId(anno.id).queryKey, anno);
        upsertSentenceAnnotation(anno);
      });
      queryClient.invalidateQueries({ queryKey: sentenceAnnotationQueries.searchScope() });
      break;
    case "SENTENCE_ANNOTATION_DELETED": {
      const anno = event.payload;
      removeSingle(sentenceAnnotationQueries.byId(anno.id).queryKey);
      removeSentenceAnnotation(anno);
      break;
    }
    case "SENTENCE_ANNOTATION_DELETED_BATCH":
      event.payload.forEach((anno) => {
        removeSingle(sentenceAnnotationQueries.byId(anno.id).queryKey);
        removeSentenceAnnotation(anno);
      });
      queryClient.invalidateQueries({ queryKey: sentenceAnnotationQueries.searchScope() });
      break;

    // ── Span groups ─────────────────────────────────────────────────────────
    // Span groups have no dedicated query key — the annotation feature derives
    // them from the sdoc's span annotations (useComputeTokenData).
    case "SPAN_GROUP_CREATED":
    case "SPAN_GROUP_UPDATED":
    case "SPAN_GROUP_DELETED":
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.bySdocOfSdocScope(event.payload.sdoc_id) });
      break;

    // ── Source document tags ────────────────────────────────────────────────
    // The payload carries the complete new tag list per sdoc — write it
    // directly. Tag-count aggregates cannot be derived from the links, so
    // those are invalidated.
    case "SDOC_TAGS_LINKED":
      Object.entries(event.payload.links).forEach(([sdocId, tagIds]) => {
        queryClient.setQueryData(tagQueries.idsBySdoc(Number(sdocId)).queryKey, tagIds);
      });
      queryClient.invalidateQueries({ queryKey: tagQueries.sdocCountScope() });
      queryClient.invalidateQueries({ queryKey: statisticsQueries.tagStatsScope() });
      break;

    // ── Source document metadata ────────────────────────────────────────────
    // The SDOC_METADATAS cache is a per-sdoc map keyed by project_metadata_id —
    // the payload carries both ids, so write it directly. SDOC_METADATA_BY_KEY
    // is keyed by the metadata key string (absent from the payload) and is a
    // legacy hook (TODO: REMOVE) — keep invalidating it.
    case "SDOC_METADATA_UPDATED":
      upsertSdocMetadata(event.payload);
      queryClient.invalidateQueries({
        queryKey: sdocMetadataQueries.bySdocAndKeyOfSdocScope(event.payload.source_document_id),
      });
      break;
    case "SDOC_METADATA_DELETED":
      removeSdocMetadata(event.payload);
      queryClient.invalidateQueries({
        queryKey: sdocMetadataQueries.bySdocAndKeyOfSdocScope(event.payload.source_document_id),
      });
      break;
    case "SDOC_METADATA_UPDATED_BATCH":
      event.payload.forEach((metadata) => {
        upsertSdocMetadata(metadata);
        queryClient.invalidateQueries({
          queryKey: sdocMetadataQueries.bySdocAndKeyOfSdocScope(metadata.source_document_id),
        });
      });
      break;

    // ── Tag recommendations ─────────────────────────────────────────────────
    // The cached query holds per-sdoc aggregates (TagRecommendationResult)
    // grouped from links + joined current tags — the flat link payload cannot
    // be mapped onto it, so invalidate the affected job lists.
    case "TAG_RECOMMENDATION_REVIEWED_BATCH": {
      const mlJobIds = new Set(event.payload.map((link) => link.ml_job_id));
      mlJobIds.forEach((mlJobId) => {
        queryClient.invalidateQueries({ queryKey: tagRecommendationQueries.byJob(mlJobId).queryKey });
      });
      break;
    }

    // ── Project membership ──────────────────────────────────────────────────
    // The payload carries the complete resulting member list — write it
    // directly into the project-keyed user list.
    case "PROJECT_USERS_LINKED":
      queryClient.setQueryData(userQueries.byProject(event.payload.project_id).queryKey, event.payload.users);
      break;

    default: {
      console.warn("Unhandled dats event");
    }
  }
}
