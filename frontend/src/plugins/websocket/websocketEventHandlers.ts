/* eslint-disable boundaries/element-types */
// This file is the central websocket event management system. It handles every
// websocket event type in one place, so it's simpler to keep everything here
// rather than splitting into multiple files.
import { handleEntityEvent } from "@api/entity-events/brain";
import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import type { ClassifierInferenceParams } from "@models/ClassifierInferenceParams";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierTask } from "@models/ClassifierTask";
import { COTARefinementJobRead } from "@models/COTARefinementJobRead";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { ImportJobRead } from "@models/ImportJobRead";
import { ImportJobType } from "@models/ImportJobType";
import { JobStatus } from "@models/JobStatus";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { MlJobRead } from "@models/MlJobRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { SearchEntityType } from "@models/SearchEntityType";
import type { WebSocketEventMap } from "@models/websocketEvents";

// The event contract (WebSocketEventMap / WebSocketEvent) is GENERATED from the
// backend's OpenAPI webhooks — see src/models/websocketEvents.ts. The backend is
// the single source of truth; adding/renaming an event there and running
// `just update-api` updates the map, and a missing/mismatched handler below
// becomes a compile error. Re-exported here for convenience.
export type { WebSocketEventMap } from "@models/websocketEvents";

/**
 * Central map of every websocket event type → its handler.
 *
 * Handlers run outside of React. Use the `queryClient` singleton to invalidate
 * queries and the redux `store` to dispatch actions.
 */
const websocketEventHandlers: {
  [K in keyof WebSocketEventMap]: (payload: WebSocketEventMap[K]) => void;
} = {
  PROJECT_CREATED: (project) => handleEntityEvent({ type: "PROJECT_CREATED", payload: project }, "websocket"),
  PROJECT_UPDATED: (project) => handleEntityEvent({ type: "PROJECT_UPDATED", payload: project }, "websocket"),
  PROJECT_DELETED: (project) => handleEntityEvent({ type: "PROJECT_DELETED", payload: project }, "websocket"),

  // ── API keys ───────────────────────────────────────────────────────────────
  API_KEY_CREATED: (apiKey) => handleEntityEvent({ type: "API_KEY_CREATED", payload: apiKey }, "websocket"),
  API_KEY_DELETED: (apiKey) => handleEntityEvent({ type: "API_KEY_DELETED", payload: apiKey }, "websocket"),

  // ── Users ──────────────────────────────────────────────────────────────────
  USER_UPDATED: (user) => handleEntityEvent({ type: "USER_UPDATED", payload: user }, "websocket"),
  USER_DELETED: (user) => handleEntityEvent({ type: "USER_DELETED", payload: user }, "websocket"),

  // ── Codes ──────────────────────────────────────────────────────────────────
  CODE_CREATED: (code) => handleEntityEvent({ type: "CODE_CREATED", payload: code }, "websocket"),
  CODE_UPDATED: (code) => handleEntityEvent({ type: "CODE_UPDATED", payload: code }, "websocket"),
  CODE_DELETED: (code) => handleEntityEvent({ type: "CODE_DELETED", payload: code }, "websocket"),

  // ── Tags ───────────────────────────────────────────────────────────────────
  TAG_CREATED: (tag) => handleEntityEvent({ type: "TAG_CREATED", payload: tag }, "websocket"),
  TAG_UPDATED: (tag) => handleEntityEvent({ type: "TAG_UPDATED", payload: tag }, "websocket"),
  TAG_DELETED: (tag) => handleEntityEvent({ type: "TAG_DELETED", payload: tag }, "websocket"),
  // Reviewed recommendations are grouped by their ML job; refresh those lists.
  TAG_RECOMMENDATION_REVIEWED_BATCH: (links) => {
    const mlJobIds = new Set(links.map((link) => link.ml_job_id));
    mlJobIds.forEach((mlJobId) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_RECOMMENDATIONS, mlJobId] });
    });
  },

  // ── Memos ──────────────────────────────────────────────────────────────────
  MEMO_CREATED: (memo) => handleEntityEvent({ type: "MEMO_CREATED", payload: memo }, "websocket"),
  MEMO_UPDATED: (memo) => handleEntityEvent({ type: "MEMO_UPDATED", payload: memo }, "websocket"),
  MEMO_UPDATED_BATCH: (memos) => handleEntityEvent({ type: "MEMO_UPDATED_BATCH", payload: memos }, "websocket"),
  MEMO_DELETED: (memo) => handleEntityEvent({ type: "MEMO_DELETED", payload: memo }, "websocket"),

  // ── Source documents ───────────────────────────────────────────────────────
  SDOC_UPDATED: (sdoc) => queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC, sdoc.id] }),
  SDOC_DELETED: (sdoc) => queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC, sdoc.id] }),
  // The complete tag set of one or more sdocs changed; refresh the affected
  // sdoc-tag queries and any tag-count aggregates.
  SDOC_TAGS_UPDATED: ({ links }) => {
    Object.keys(links).forEach((sdocId) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, Number(sdocId)] });
    });
    queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
  },

  // ── Span annotations ───────────────────────────────────────────────────────
  SPAN_ANNOTATION_CREATED: (anno) => invalidateSpanAnnotations(anno),
  SPAN_ANNOTATION_CREATED_BATCH: (annos) => annos.forEach(invalidateSpanAnnotations),
  SPAN_ANNOTATION_UPDATED: (anno) => invalidateSpanAnnotations(anno),
  SPAN_ANNOTATION_UPDATED_BATCH: (annos) => annos.forEach(invalidateSpanAnnotations),
  SPAN_ANNOTATION_DELETED: (anno) => invalidateSpanAnnotations(anno),
  SPAN_ANNOTATION_DELETED_BATCH: (annos) => annos.forEach(invalidateSpanAnnotations),

  // ── BBox annotations ───────────────────────────────────────────────────────
  BBOX_ANNOTATION_CREATED: (anno) => invalidateBBoxAnnotations(anno),
  BBOX_ANNOTATION_UPDATED: (anno) => invalidateBBoxAnnotations(anno),
  BBOX_ANNOTATION_UPDATED_BATCH: (annos) => annos.forEach(invalidateBBoxAnnotations),
  BBOX_ANNOTATION_DELETED: (anno) => invalidateBBoxAnnotations(anno),
  BBOX_ANNOTATION_DELETED_BATCH: (annos) => annos.forEach(invalidateBBoxAnnotations),

  // ── Sentence annotations ───────────────────────────────────────────────────
  SENTENCE_ANNOTATION_CREATED: (anno) => invalidateSentenceAnnotations(anno),
  SENTENCE_ANNOTATION_CREATED_BATCH: (annos) => annos.forEach(invalidateSentenceAnnotations),
  SENTENCE_ANNOTATION_UPDATED: (anno) => invalidateSentenceAnnotations(anno),
  SENTENCE_ANNOTATION_UPDATED_BATCH: (annos) => annos.forEach(invalidateSentenceAnnotations),
  SENTENCE_ANNOTATION_DELETED: (anno) => invalidateSentenceAnnotations(anno),
  SENTENCE_ANNOTATION_DELETED_BATCH: (annos) => annos.forEach(invalidateSentenceAnnotations),

  // ── Folders ────────────────────────────────────────────────────────────────
  FOLDER_CREATED: (folder) => handleEntityEvent({ type: "FOLDER_CREATED", payload: folder }, "websocket"),
  FOLDER_UPDATED: (folder) => handleEntityEvent({ type: "FOLDER_UPDATED", payload: folder }, "websocket"),
  FOLDER_DELETED: (folder) => handleEntityEvent({ type: "FOLDER_DELETED", payload: folder }, "websocket"),
  FOLDER_UPDATED_BATCH: (folders) => handleEntityEvent({ type: "FOLDER_UPDATED_BATCH", payload: folders }, "websocket"),

  // ── Project metadata ───────────────────────────────────────────────────────
  PROJECT_METADATA_CREATED: (metadata) =>
    handleEntityEvent({ type: "PROJECT_METADATA_CREATED", payload: metadata }, "websocket"),
  PROJECT_METADATA_UPDATED: (metadata) =>
    handleEntityEvent({ type: "PROJECT_METADATA_UPDATED", payload: metadata }, "websocket"),
  PROJECT_METADATA_DELETED: (metadata) =>
    handleEntityEvent({ type: "PROJECT_METADATA_DELETED", payload: metadata }, "websocket"),

  // ── Source document metadata ───────────────────────────────────────────────
  SDOC_METADATA_UPDATED: (metadata) => {
    queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
    queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA_BY_KEY, metadata.source_document_id] });
  },
  SDOC_METADATA_DELETED: (metadata) => {
    queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
    queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA_BY_KEY, metadata.source_document_id] });
  },
  SDOC_METADATA_UPDATED_BATCH: (metadatas) => {
    metadatas.forEach((metadata) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA_BY_KEY, metadata.source_document_id] });
    });
  },

  // ── Span groups ────────────────────────────────────────────────────────────
  // Span-group queries are keyed by sdoc; the payload carries sdoc_id.
  SPAN_GROUP_CREATED: (group) => invalidateSpanGroups(group),
  SPAN_GROUP_UPDATED: (group) => invalidateSpanGroups(group),
  SPAN_GROUP_DELETED: (group) => invalidateSpanGroups(group),

  // ── Whiteboards ────────────────────────────────────────────────────────────
  WHITEBOARD_CREATED: (whiteboard) =>
    handleEntityEvent({ type: "WHITEBOARD_CREATED", payload: whiteboard }, "websocket"),
  WHITEBOARD_UPDATED: (whiteboard) =>
    handleEntityEvent({ type: "WHITEBOARD_UPDATED", payload: whiteboard }, "websocket"),
  WHITEBOARD_DELETED: (whiteboard) =>
    handleEntityEvent({ type: "WHITEBOARD_DELETED", payload: whiteboard }, "websocket"),

  // ── Timeline analyses ──────────────────────────────────────────────────────
  TIMELINE_ANALYSIS_CREATED: (ta) => handleEntityEvent({ type: "TIMELINE_ANALYSIS_CREATED", payload: ta }, "websocket"),
  TIMELINE_ANALYSIS_UPDATED: (ta) => handleEntityEvent({ type: "TIMELINE_ANALYSIS_UPDATED", payload: ta }, "websocket"),
  TIMELINE_ANALYSIS_DELETED: (ta) => handleEntityEvent({ type: "TIMELINE_ANALYSIS_DELETED", payload: ta }, "websocket"),

  // ── Concept-over-time analyses ─────────────────────────────────────────────
  COTA_CREATED: (cota) => handleEntityEvent({ type: "COTA_CREATED", payload: cota }, "websocket"),
  COTA_UPDATED: (cota) => handleEntityEvent({ type: "COTA_UPDATED", payload: cota }, "websocket"),
  COTA_DELETED: (cota) => handleEntityEvent({ type: "COTA_DELETED", payload: cota }, "websocket"),

  // ── Perspectives (aspects) ─────────────────────────────────────────────────
  ASPECT_CREATED: (aspect) => handleEntityEvent({ type: "ASPECT_CREATED", payload: aspect }, "websocket"),
  ASPECT_UPDATED: (aspect) => handleEntityEvent({ type: "ASPECT_UPDATED", payload: aspect }, "websocket"),
  ASPECT_DELETED: (aspect) => handleEntityEvent({ type: "ASPECT_DELETED", payload: aspect }, "websocket"),

  // ── Classifiers ────────────────────────────────────────────────────────────
  CLASSIFIER_UPDATED: (classifier) =>
    handleEntityEvent({ type: "CLASSIFIER_UPDATED", payload: classifier }, "websocket"),
  CLASSIFIER_DELETED: (classifier) =>
    handleEntityEvent({ type: "CLASSIFIER_DELETED", payload: classifier }, "websocket"),

  // ── Project membership ─────────────────────────────────────────────────────
  // PROJECT_USERS is keyed by project id, but UserRead has no project_id — the
  // membership changed, so invalidate all project-user lists.
  PROJECT_USER_ADDED: () => queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS] }),
  PROJECT_USER_REMOVED: () => queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS] }),

  // ── Jobs ───────────────────────────────────────────────────────────────────
  // The payload is the full concrete JobRead — write it directly into the
  // single-job cache and the per-type project job list (no invalidation for job
  // data). Derived-data side-effects of a finished job are invalidated below.
  JOB_UPDATED: (job) => {
    switch (job.job_type) {
      case ExportJobRead.job_type.EXPORT:
        upsertJob(job, QueryKey.EXPORT_JOB);
        break;
      case ImportJobRead.job_type.IMPORT:
        upsertJob(job, QueryKey.IMPORT_JOB, QueryKey.PROJECT_IMPORT_JOBS);
        if (job.status === JobStatus.FINISHED) handleImportJobFinished(job);
        break;
      case CrawlerJobRead.job_type.CRAWLER:
        upsertJob(job, QueryKey.CRAWLER_JOB, QueryKey.PROJECT_CRAWLER_JOBS);
        break;
      case LlmAssistantJobRead.job_type.LLM_ASSISTANT:
        upsertJob(job, QueryKey.LLM_JOB, QueryKey.PROJECT_LLM_JOBS);
        break;
      case MlJobRead.job_type.ML:
        upsertJob(job, QueryKey.ML_JOB, QueryKey.PROJECT_ML_JOBS);
        break;
      case ClassifierJobRead.job_type.CLASSIFIER:
        upsertJob(job, QueryKey.CLASSIFIER_JOB, QueryKey.PROJECT_CLASSIFIER_JOBS);
        if (job.status === JobStatus.FINISHED) handleClassifierJobFinished(job);
        break;
      case DuplicateFinderJobRead.job_type.DUPLICATE_FINDER:
        upsertJob(job, QueryKey.DUPLICATE_FINDER_JOB);
        break;
      case COTARefinementJobRead.job_type.COTA_REFINEMENT:
        upsertJob(job, QueryKey.COTA_REFINEMENT_JOB);
        break;
      case PerspectivesJobRead.job_type.PERSPECTIVES:
        upsertJob(job, QueryKey.PERSPECTIVES_JOB);
        if (job.status === JobStatus.FINISHED) handlePerspectivesJobFinished(job);
        break;
      default: {
        const _exhaustive: never = job;
        console.warn("Unhandled job type in JOB_UPDATED:", _exhaustive);
      }
    }
  },

  // ── Search views ───────────────────────────────────────────────────────────
  // Views are personal per-user state; these events only reach the owner's
  // other sessions. View queries are keyed by [viewQueryKey, entityType, projectId].
  SEARCH_VIEW_CREATED: (view) => invalidateSearchViews(view),
  SEARCH_VIEW_UPDATED: (view) => invalidateSearchViews(view),
  SEARCH_VIEW_DELETED: (view) => invalidateSearchViews(view),
  SEARCH_VIEW_UPDATED_BATCH: (views) => views.forEach(invalidateSearchViews),
};

// ── Job helpers ──────────────────────────────────────────────────────────────
// A job update carries the full JobRead: write it into the single-job cache and
// upsert it into the project job-list cache (if the job type has one).
function upsertJob<T extends { job_id: string; project_id: number }>(
  job: T,
  singleKey: (typeof QueryKey)[keyof typeof QueryKey],
  listKey?: (typeof QueryKey)[keyof typeof QueryKey],
) {
  queryClient.setQueryData([singleKey, job.job_id], job);
  if (!listKey) return;
  queryClient.setQueryData<T[]>([listKey, job.project_id], (old) => {
    if (!old) return old;
    const index = old.findIndex((j) => j.job_id === job.job_id);
    if (index === -1) return [...old, job];
    const next = [...old];
    next[index] = job;
    return next;
  });
}

// A finished import job created entities of its type — refresh the derived data.
function handleImportJobFinished(job: ImportJobRead) {
  const projectId = job.input.project_id;
  switch (job.input.import_job_type) {
    case ImportJobType.TAGS:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, projectId] });
      break;
    case ImportJobType.CODES:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, projectId] });
      break;
    case ImportJobType.FOLDERS:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_FOLDERS, projectId] });
      break;
    case ImportJobType.PROJECT_METADATA:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, projectId] });
      break;
    case ImportJobType.USERS:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, projectId] });
      break;
    case ImportJobType.TIMELINE_ANALYSES:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TIMELINE_ANALYSIS, projectId] });
      break;
    case ImportJobType.WHITEBOARDS:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, projectId] });
      break;
    case ImportJobType.COTA:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_COTAS, projectId] });
      break;
    case ImportJobType.DOCUMENTS:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE, projectId] });
      break;
    case ImportJobType.MEMOS:
      queryClient.invalidateQueries({ queryKey: [QueryKey.OBJECT_MEMOS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
      break;
    case ImportJobType.PROJECT:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TIMELINE_ANALYSIS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_COTAS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.OBJECT_MEMOS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
      break;
    case ImportJobType.BBOX_ANNOTATIONS:
    case ImportJobType.SPAN_ANNOTATIONS:
    case ImportJobType.SENTENCE_ANNOTATIONS:
      break;
    default:
      console.error("Unknown import job type");
      break;
  }
}

// A finished classifier job may have created/updated classifiers; document
// inference jobs also tagged the affected sdocs.
function handleClassifierJobFinished(job: ClassifierJobRead) {
  queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CLASSIFIERS, job.project_id] });
  if (
    job.input.model_type === ClassifierModel.DOCUMENT &&
    job.input.task_type === ClassifierTask.INFERENCE &&
    job.output
  ) {
    (job.input.task_parameters as ClassifierInferenceParams).sdoc_ids.forEach((sdocId) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
    });
  }
}

// A finished perspectives job recomputed the aspect's visualization data.
function handlePerspectivesJobFinished(job: PerspectivesJobRead) {
  queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, job.input.aspect_id] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CLUSTER_SIMILARITIES, job.input.aspect_id] });
}

// Span groups have no dedicated query key — the annotation feature derives them
// from the sdoc's span annotations (useComputeTokenData). Invalidate those.
function invalidateSpanGroups(group: { sdoc_id: number }) {
  queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, group.sdoc_id] });
}

// Annotation queries are keyed by sdoc/code/user in various combinations; the
// payload always carries sdoc_id + code_id, so invalidate every related slice.
function invalidateSpanAnnotations(anno: { id?: number; sdoc_id: number; code_id: number }) {
  if (anno.id !== undefined) {
    queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, anno.id] });
  }
  queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, anno.sdoc_id] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, anno.code_id] });
}

function invalidateBBoxAnnotations(anno: { id: number; sdoc_id: number; code_id: number }) {
  queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION, anno.id] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, anno.sdoc_id] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, anno.code_id] });
}

function invalidateSentenceAnnotations(anno: { id: number; sdoc_id: number; code_id: number }) {
  queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION, anno.id] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, anno.sdoc_id] });
}

// Each entity's views live under their own query key; the payload's entity_type
// selects which one to invalidate.
const SEARCH_VIEW_QUERY_KEYS: Record<SearchEntityType, (typeof QueryKey)[keyof typeof QueryKey]> = {
  [SearchEntityType.MEMO]: QueryKey.MEMO_VIEWS,
  [SearchEntityType.SPAN_ANNOTATION]: QueryKey.SPAN_ANNO_VIEWS,
  [SearchEntityType.SENTENCE_ANNOTATION]: QueryKey.SENTENCE_ANNO_VIEWS,
  [SearchEntityType.BBOX_ANNOTATION]: QueryKey.BBOX_ANNO_VIEWS,
};

function invalidateSearchViews(view: { entity_type?: string; project_id: number }) {
  const queryKey = SEARCH_VIEW_QUERY_KEYS[view.entity_type as SearchEntityType];
  if (!queryKey) return;
  queryClient.invalidateQueries({
    queryKey: [queryKey, view.entity_type, view.project_id],
  });
}

export function handleWebSocketEvent(type: string, payload: unknown): void {
  const handler = websocketEventHandlers[type as keyof WebSocketEventMap];
  if (!handler) {
    console.warn(`Received unknown WebSocket event type: ${type}`);
    return;
  }
  // The registry guarantees handler/payload compatibility by construction.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler(payload as any);
}
