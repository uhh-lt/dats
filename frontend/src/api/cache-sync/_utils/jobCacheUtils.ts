import { queryClient } from "@api/queryClient";
import { codeQueries } from "@core/code/api/codeQueries";
import { exportQueries } from "@core/export-buttons/api/exportQueries";
import { isJobQueryKey } from "@core/job";
import { folderQueries } from "@core/folder/api/folderQueries";
import { memoQueries } from "@core/memo/api/memoQueries";
import { projectMetadataQueries } from "@core/project-metadata/api/projectMetadataQueries";
import { promptQueries } from "@core/prompt/api/promptQueries";
import { sentenceAnnotationQueries } from "@core/sentence-annotation/api/sentenceAnnotationQueries";
import { sdocQueries } from "@core/source-document/api/sdocQueries";
import { spanAnnotationQueries } from "@core/span-annotation/api/spanAnnotationQueries";
import { tagQueries } from "@core/tag/api/tagQueries";
import { userQueries } from "@core/user/api/userQueries";
import { classifierQueries } from "@features/classifier/api/classifierQueries";
import { cotaQueries } from "@features/concept-over-time-analysis/api/cotaQueries";
import { documentUploadQueries } from "@features/document-upload/api/documentUploadQueries";
import { duplicateFinderQueries } from "@features/duplicate-finder/api/duplicateFinderQueries";
import { experimentQueries } from "@features/experiment-studio/api/experimentQueries";
import { llmAssistantQueries } from "@features/llm-assistant/api/llmAssistantQueries";
import { perspectivesQueries } from "@features/perspectives/api/perspectivesQueries";
import { importQueries } from "@features/project-settings/api/importQueries";
import { tagRecommendationQueries } from "@features/tag-recommendations/api/tagRecommendationQueries";
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
import { ExperimentRunJobRead } from "@models/ExperimentRunJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { ImportJobRead } from "@models/ImportJobRead";
import { ImportJobType } from "@models/ImportJobType";
import { JobStatus } from "@models/JobStatus";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { TagRecommendationJobRead } from "@models/TagRecommendationJobRead";
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
      if (LLM_ASSISTANT_ENDED_WITH_ANNOTATIONS.has(job.status)) handleLlmAssistantJobEnded(job);
      break;
    case ExperimentRunJobRead.job_type.EXPERIMENT_RUN:
      handleExperimentRunJobUpdate(job);
      break;
    case TagRecommendationJobRead.job_type.TAG_RECOMMENDATION:
      upsertJob(job, tagRecommendationQueries.job);
      // the recommendations of the job exist once it finished
      if (job.status === JobStatus.FINISHED) {
        queryClient.invalidateQueries({ queryKey: tagRecommendationQueries.byJob(job.job_id).queryKey });
      }
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
      upsertJob(job, perspectivesQueries.job);
      writeAspectMostRecentJob(job);
      if (job.status === JobStatus.FINISHED) handlePerspectivesJobFinished(job);
      break;
    default: {
      const _exhaustive: never = job;
      console.warn("Unhandled job type in JOB_UPDATED:", _exhaustive);
    }
  }
}

// The websocket (re)connected: the job updates pushed while no socket was open are lost, so refetch the jobs of all types.
export function invalidateAllJobs(): void {
  queryClient.invalidateQueries({ predicate: ({ queryKey }) => isJobQueryKey(queryKey) });
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
      queryClient.invalidateQueries({ queryKey: folderQueries.byProjectOfProjectScope(projectId) });
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
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchOfProjectScope(projectId) });
      break;
    case ImportJobType.MEMOS:
      queryClient.invalidateQueries({ queryKey: memoQueries.all() });
      break;
    case ImportJobType.PROMPTS:
      queryClient.invalidateQueries({ queryKey: promptQueries.byProject(projectId).queryKey });
      break;
    case ImportJobType.PROJECT:
      queryClient.invalidateQueries({ queryKey: tagQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: codeQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: projectMetadataQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: userQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: timelineAnalysisQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: whiteboardQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: cotaQueries.byProject(projectId).queryKey });
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchOfProjectScope(projectId) });
      queryClient.invalidateQueries({ queryKey: memoQueries.all() });
      queryClient.invalidateQueries({ queryKey: promptQueries.byProject(projectId).queryKey });
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

// An annotation LLM Assistant job stores its suggestions as annotations of the assistant user in the processed sdocs,
// batch by batch: a failed or stopped job keeps the annotations of the batches it saved.
const LLM_ASSISTANT_ENDED_WITH_ANNOTATIONS = new Set([JobStatus.FINISHED, JobStatus.FAILED, JobStatus.STOPPED]);
function handleLlmAssistantJobEnded(job: LlmAssistantJobRead) {
  invalidateAssistantAnnotations(job.input.task_type, new Set(job.input.sdoc_ids));
}

// The job of an experiment run stores its state, the run's status, and the scores in the experiment (the job has no
// own cache). Refresh the experiments when the job's state differs from the run's stored status; a finished job also
// wrote the annotations of the run's virtual user.
const STORED_RUN_STATUSES = new Set([JobStatus.STARTED, JobStatus.FINISHED, JobStatus.FAILED]);
function handleExperimentRunJobUpdate(job: ExperimentRunJobRead) {
  const queryKey = experimentQueries.byProject(job.project_id).queryKey;
  const experiment = Object.values(queryClient.getQueryData(queryKey) ?? {}).find((candidate) =>
    candidate.runs.some((run) => run.id === job.input.run_id),
  );
  const run = experiment?.runs.find((candidate) => candidate.id === job.input.run_id);
  if (STORED_RUN_STATUSES.has(job.status) && run?.status !== job.status) {
    queryClient.invalidateQueries({ queryKey });
  }
  if (job.status === JobStatus.FINISHED && job.output) {
    const sdocIds = new Set(job.output.specific_task_result.results.map((result) => result.sdoc_id));
    invalidateAssistantAnnotations(job.output.task_type, sdocIds);
    return;
  }
  // a failed or stopped run keeps the annotations of the batches it saved; the job input names the run only, so its
  // documents and task come from the experiments, else all annotations are refreshed
  if (job.status !== JobStatus.FAILED && job.status !== JobStatus.STOPPED) return;
  if (experiment && run) {
    invalidateAssistantAnnotations(experiment.task_type, new Set(run.sdoc_ids));
    return;
  }
  queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.bySdocScope() });
  queryClient.invalidateQueries({ queryKey: sentenceAnnotationQueries.bySdocScope() });
}

function invalidateAssistantAnnotations(taskType: TaskType, sdocIds: Set<number>) {
  switch (taskType) {
    case TaskType.ANNOTATION:
      invalidateBySdocs(spanAnnotationQueries.bySdocScope(), sdocIds);
      break;
    case TaskType.SENTENCE_ANNOTATION:
      invalidateBySdocs(sentenceAnnotationQueries.bySdocScope(), sdocIds);
      break;
    default:
      break;
  }
}

// One invalidation for the per-sdoc queries of many sdocs (a run may process thousands): the key continues the scope
// with the sdoc id.
function invalidateBySdocs(bySdocScope: readonly unknown[], sdocIds: Set<number>) {
  queryClient.invalidateQueries({
    queryKey: bySdocScope,
    predicate: ({ queryKey }) => {
      const sdocId = queryKey[bySdocScope.length];
      return typeof sdocId === "number" && sdocIds.has(sdocId);
    },
  });
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
      queryClient.invalidateQueries({ queryKey: tagQueries.idsBySdocOfSdocScope(sdocId) });
    });
  }
}

// The backend starts a perspectives job only when no other job of the aspect is running, so every update belongs to
// the aspect's most recent job.
function writeAspectMostRecentJob(job: PerspectivesJobRead) {
  queryClient.setQueryData(perspectivesQueries.aspectsByProject(job.project_id).queryKey, (old) => {
    const aspect = old?.[job.input.aspect_id];
    if (!old || !aspect || aspect.most_recent_job_id === job.job_id) return old;
    return { ...old, [aspect.id]: { ...aspect, most_recent_job_id: job.job_id } };
  });
}

// A finished perspectives job recomputed the aspect's visualization data.
function handlePerspectivesJobFinished(job: PerspectivesJobRead) {
  queryClient.invalidateQueries({ queryKey: perspectivesQueries.visualizationOfAspectScope(job.input.aspect_id) });
  queryClient.invalidateQueries({ queryKey: perspectivesQueries.clusterSimilarities(job.input.aspect_id).queryKey });
}

// A finished COTA refinement job updated the COTA — refresh the project's COTAs.
function handleCOTARefinementJobFinished(job: COTARefinementJobRead) {
  queryClient.invalidateQueries({ queryKey: cotaQueries.byProject(job.input.project_id).queryKey });
}
