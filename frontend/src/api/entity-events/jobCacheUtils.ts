import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import type { ClassifierInferenceParams } from "@models/ClassifierInferenceParams";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierTask } from "@models/ClassifierTask";
import { COTARefinementJobRead } from "@models/COTARefinementJobRead";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import type { DATSEventMap } from "@models/datsEvents";
import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { ImportJobRead } from "@models/ImportJobRead";
import { ImportJobType } from "@models/ImportJobType";
import { JobStatus } from "@models/JobStatus";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { MlJobRead } from "@models/MlJobRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";

type JobRead = DATSEventMap["JOB_UPDATED"];

/**
 * Apply a JOB_UPDATED event to the cache. The payload is the full concrete
 * JobRead — write it directly into the single-job cache and the per-type
 * project job list (no invalidation for job data). Derived-data side-effects
 * of a finished job are invalidated below.
 */
export function writeJobUpdate(job: JobRead): void {
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
}

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
