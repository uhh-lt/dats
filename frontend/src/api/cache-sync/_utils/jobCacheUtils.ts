import { queryClient } from "@api/queryClient";
import { codeQueries } from "@core/code/api/codeQueries";
import { exportQueries } from "@core/export-buttons/api/exportQueries";
import { folderQueries } from "@core/folder/api/folderQueries";
import { memoQueries } from "@core/memo/api/memoQueries";
import { projectMetadataQueries } from "@core/project-metadata/api/projectMetadataQueries";
import { sentenceAnnotationQueries } from "@core/sentence-annotation/api/sentenceAnnotationQueries";
import { sdocQueries } from "@core/source-document/api/sdocQueries";
import { spanAnnotationQueries } from "@core/span-annotation/api/spanAnnotationQueries";
import { tagQueries } from "@core/tag/api/tagQueries";
import { userQueries } from "@core/user/api/userQueries";
import { classifierQueries } from "@features/classifier/api/classifierQueries";
import { cotaQueries } from "@features/concept-over-time-analysis/api/cotaQueries";
import { documentUploadQueries } from "@features/document-upload/api/documentUploadQueries";
import { duplicateFinderQueries } from "@features/duplicate-finder/api/duplicateFinderQueries";
import { llmAssistantQueries } from "@features/llm-assistant/api/llmAssistantQueries";
import { mlAutomationQueries } from "@features/ml-automation/api/mlAutomationQueries";
import { perspectiveQueries } from "@features/perspectives/api/perspectiveQueries";
import { importQueries } from "@features/project-settings/api/importQueries";
import { timelineAnalysisQueries } from "@features/timeline-analysis/api/timelineAnalysisQueries";
import { whiteboardQueries } from "@features/whiteboard/api/whiteboardQueries";
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
import { TaskType } from "@models/TaskType";
import type { DataTag } from "@tanstack/react-query";

type JobRead = DATSEventMap["JOB_UPDATED"];

/**
 * Apply a JOB_UPDATED event to the cache. The payload is the full concrete
 * JobRead — write it directly into the single-job cache and the per-type
 * project job list (no invalidation for job data). Derived-data side-effects
 * of a finished job are invalidated below.
 */
export function handleJobUpdate(job: JobRead): void {
  switch (job.job_type) {
    case ExportJobRead.job_type.EXPORT:
      upsertJob(job, exportQueries.job);
      break;
    case ImportJobRead.job_type.IMPORT:
      upsertJob(job, importQueries.job);
      if (job.status === JobStatus.FINISHED) handleImportJobFinished(job);
      break;
    case CrawlerJobRead.job_type.CRAWLER:
      upsertJob(job, documentUploadQueries.job);
      break;
    case LlmAssistantJobRead.job_type.LLM_ASSISTANT:
      upsertJob(job, llmAssistantQueries.job);
      if (job.status === JobStatus.FINISHED) handleLlmAssistantJobFinished(job);
      break;
    case MlJobRead.job_type.ML:
      upsertJob(job, mlAutomationQueries.job);
      break;
    case ClassifierJobRead.job_type.CLASSIFIER:
      upsertJob(job, classifierQueries.job);
      if (job.status === JobStatus.FINISHED) handleClassifierJobFinished(job);
      break;
    case DuplicateFinderJobRead.job_type.DUPLICATE_FINDER:
      upsertJob(job, duplicateFinderQueries.job);
      break;
    case COTARefinementJobRead.job_type.COTA_REFINEMENT:
      upsertJob(job, cotaQueries.job);
      if (job.status === JobStatus.FINISHED) handleCOTARefinementJobFinished(job);
      break;
    case PerspectivesJobRead.job_type.PERSPECTIVES:
      upsertJob(job, perspectiveQueries.job);
      writeAspectMostRecentJob(job);
      if (job.status === JobStatus.FINISHED) handlePerspectivesJobFinished(job);
      break;
    default: {
      const _exhaustive: never = job;
      console.warn("Unhandled job type in JOB_UPDATED:", _exhaustive);
    }
  }
}

// The query definitions of one job type (`<domain>Queries.job`): the single-job query and, for types that have one,
// the per-project job list.
interface JobTypeQueries<T> {
  byId: (jobId: string) => {
    queryKey: DataTag<readonly unknown[], T | null | undefined, Error> | DataTag<readonly unknown[], T, Error>;
  };
  byProject?: (projectId: number) => { queryKey: DataTag<readonly unknown[], T[], Error> };
}

// A job update carries the full JobRead: write it into the single-job cache and
// upsert it into the project job-list cache (if the job type has one).
function upsertJob<T extends { job_id: string; project_id: number }>(job: T, queries: JobTypeQueries<T>) {
  queryClient.setQueryData(queries.byId(job.job_id).queryKey, job);
  if (!queries.byProject) return;
  queryClient.setQueryData(queries.byProject(job.project_id).queryKey, (old) => {
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
      queryClient.invalidateQueries({ queryKey: tagQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.CODES:
      queryClient.invalidateQueries({ queryKey: codeQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.FOLDERS:
      queryClient.invalidateQueries({ queryKey: folderQueries.ofProjectScope(projectId) });
      break;
    case ImportJobType.PROJECT_METADATA:
      queryClient.invalidateQueries({ queryKey: projectMetadataQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.USERS:
      queryClient.invalidateQueries({ queryKey: userQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.TIMELINE_ANALYSES:
      queryClient.invalidateQueries({ queryKey: timelineAnalysisQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.WHITEBOARDS:
      queryClient.invalidateQueries({ queryKey: whiteboardQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.COTA:
      queryClient.invalidateQueries({ queryKey: cotaQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.DOCUMENTS:
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchByProject(projectId) });
      break;
    case ImportJobType.MEMOS:
      queryClient.invalidateQueries({ queryKey: memoQueries.all() });
      break;
    case ImportJobType.PROJECT:
      queryClient.invalidateQueries({ queryKey: tagQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: codeQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: projectMetadataQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: userQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: timelineAnalysisQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: whiteboardQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: cotaQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchByProject(projectId) });
      queryClient.invalidateQueries({ queryKey: memoQueries.all() });
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

// A finished annotation LLM Assistant job stored its suggestions as annotations of the assistant user in the processed sdocs.
function handleLlmAssistantJobFinished(job: LlmAssistantJobRead) {
  if (!job.output) return;
  const sdocIds = job.output.specific_task_result.results.map((result) => result.sdoc_id);
  switch (job.input.task_type) {
    case TaskType.ANNOTATION:
      sdocIds.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.bySdocOfSdocScope(sdocId) });
      });
      break;
    case TaskType.SENTENCE_ANNOTATION:
      sdocIds.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: sentenceAnnotationQueries.bySdocOfSdocScope(sdocId) });
      });
      break;
    default:
      break;
  }
}

// A finished classifier job may have created/updated classifiers; document
// inference jobs also tagged the affected sdocs.
function handleClassifierJobFinished(job: ClassifierJobRead) {
  queryClient.invalidateQueries({ queryKey: classifierQueries.byProject(job.project_id).queryKey });
  if (
    job.input.model_type === ClassifierModel.DOCUMENT &&
    job.input.task_type === ClassifierTask.INFERENCE &&
    job.output
  ) {
    (job.input.task_parameters as ClassifierInferenceParams).sdoc_ids.forEach((sdocId) => {
      queryClient.invalidateQueries({ queryKey: tagQueries.idsBySdoc(sdocId).queryKey });
    });
  }
}

// The backend starts a perspectives job only when no other job of the aspect is running, so every update belongs to
// the aspect's most recent job.
function writeAspectMostRecentJob(job: PerspectivesJobRead) {
  queryClient.setQueryData(perspectiveQueries.aspectsByProject(job.project_id).queryKey, (old) => {
    const aspect = old?.[job.input.aspect_id];
    if (!old || !aspect || aspect.most_recent_job_id === job.job_id) return old;
    return { ...old, [aspect.id]: { ...aspect, most_recent_job_id: job.job_id } };
  });
}

// A finished perspectives job recomputed the aspect's visualization data.
function handlePerspectivesJobFinished(job: PerspectivesJobRead) {
  queryClient.invalidateQueries({ queryKey: perspectiveQueries.visualizationOfAspectScope(job.input.aspect_id) });
  queryClient.invalidateQueries({ queryKey: perspectiveQueries.clusterSimilarities(job.input.aspect_id).queryKey });
}

// A finished COTA refinement job updated the COTA — refresh the project's COTAs.
function handleCOTARefinementJobFinished(job: COTARefinementJobRead) {
  queryClient.invalidateQueries({ queryKey: cotaQueries.byProject(job.input.project_id).queryKey });
}
