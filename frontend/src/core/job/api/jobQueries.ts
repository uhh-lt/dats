import { ClassifierService } from "@api/services/ClassifierService";
import { ConceptOverTimeAnalysisService } from "@api/services/ConceptOverTimeAnalysisService";
import { ImportService } from "@api/services/ImportService";
import { JobService } from "@api/services/JobService";
import { LlmService } from "@api/services/LlmService";
import { PerspectivesService } from "@api/services/PerspectivesService";
import { queryOptions, skipToken } from "@tanstack/react-query";

const jobRoot = () => ["jobs"] as const;

/**
 * Query factory for background jobs. Every job type has the same shape:
 *
 *   jobQueries.<type>.all()                   ["jobs", "<type>"]
 *   jobQueries.<type>.byId(jobId)             ["jobs", "<type>", "detail", jobId]
 *   jobQueries.<type>.byProject(projectId)    ["jobs", "<type>", "project", projectId]   (only for types with a list)
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into these caches by the cache-sync code.
 */

const mlJobQueries = {
  all: () => [...jobRoot(), "ml"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...mlJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getMlJobById({ jobId }),
    }),
  byProjectScope: () => [...mlJobQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...mlJobQueries.byProjectScope(), projectId] as const,
      queryFn: () => JobService.getMlJobsByProject({ projectId }),
    }),
};

const classifierJobQueries = {
  all: () => [...jobRoot(), "classifier"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...classifierJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => ClassifierService.getClassifierJobById({ jobId }),
    }),
  byProjectScope: () => [...classifierJobQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...classifierJobQueries.byProjectScope(), projectId] as const,
      queryFn: () => ClassifierService.getClassifierJobsByProject({ projectId }),
    }),
};

const crawlerJobQueries = {
  all: () => [...jobRoot(), "crawler"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...crawlerJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getCrawlerJobById({ jobId }),
    }),
  byProjectScope: () => [...crawlerJobQueries.all(), "project"] as const,
  byProject: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...crawlerJobQueries.byProjectScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => JobService.getCrawlerJobsByProject({ projectId }),
    }),
};

const importJobQueries = {
  all: () => [...jobRoot(), "import"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...importJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => ImportService.getImportJob({ importJobId: jobId }),
    }),
  byProjectScope: () => [...importJobQueries.all(), "project"] as const,
  byProject: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...importJobQueries.byProjectScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => ImportService.getAllImportJobs({ projectId }),
    }),
};

const llmJobQueries = {
  all: () => [...jobRoot(), "llm"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...llmJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => LlmService.getLlmAssistantJobById({ jobId }),
    }),
  byProjectScope: () => [...llmJobQueries.all(), "project"] as const,
  byProject: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...llmJobQueries.byProjectScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => LlmService.getLlmAssistantJobsByProject({ projectId }),
    }),
};

const exportJobQueries = {
  all: () => [...jobRoot(), "export"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...exportJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getExportJobById({ jobId }),
    }),
};

const duplicateFinderJobQueries = {
  all: () => [...jobRoot(), "duplicateFinder"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...duplicateFinderJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getDuplicateFinderJobById({ jobId }),
    }),
};

const cotaRefinementJobQueries = {
  all: () => [...jobRoot(), "cotaRefinement"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...cotaRefinementJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => ConceptOverTimeAnalysisService.getCotaJob({ cotaJobId: jobId }),
    }),
};

const perspectivesJobQueries = {
  all: () => [...jobRoot(), "perspectives"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...perspectivesJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => PerspectivesService.getPerspectivesJob({ perspectivesJobId: jobId }),
    }),
};

export const jobQueries = {
  all: jobRoot,
  ml: mlJobQueries,
  classifier: classifierJobQueries,
  crawler: crawlerJobQueries,
  import: importJobQueries,
  llm: llmJobQueries,
  export: exportJobQueries,
  duplicateFinder: duplicateFinderJobQueries,
  cotaRefinement: cotaRefinementJobQueries,
  perspectives: perspectivesJobQueries,
};
