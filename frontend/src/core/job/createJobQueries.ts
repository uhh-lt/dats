import { type QueryKey, queryOptions, skipToken } from "@tanstack/react-query";

/** A job, addressed by its project and its id like every job route. */
export interface JobRef {
  projectId: number;
  jobId: string;
}

/** The generated abort and retry endpoints of a job type; each answers whether it stopped or requeued the job. */
export interface JobActions {
  abort: (job: JobRef) => Promise<boolean>;
  retry: (job: JobRef) => Promise<boolean>;
}

/** What a job list item needs to offer the actions of its job type: none if the type generates no such endpoints. */
export interface JobActionQueries {
  all: () => readonly [string, "job"];
  actions?: JobActions;
}

/** The queries of a job type that generates the abort and retry endpoints. */
export interface JobQueriesWithActions extends JobActionQueries {
  actions: JobActions;
}

/** Whether a job type offers the abort and retry actions. */
export const hasJobActions = (jobQueries: JobActionQueries): jobQueries is JobQueriesWithActions =>
  jobQueries.actions !== undefined;

export interface JobQueriesWithoutList<TJob> extends JobActionQueries {
  byId: (projectId: number | null | undefined, jobId: string | null | undefined) => ReturnType<typeof jobById<TJob>>;
}

interface JobQueriesWithList<TJob> extends JobQueriesWithoutList<TJob> {
  byProjectScope: () => readonly [string, "job", "project"];
  byProject: (projectId: number) => ReturnType<typeof jobsByProject<TJob>>;
}

const jobById = <TJob>(
  scope: readonly unknown[],
  projectId: number | null | undefined,
  jobId: string | null | undefined,
  fetchJob: (job: JobRef) => Promise<TJob>,
) =>
  queryOptions({
    queryKey: [...scope, "detail", jobId, projectId] as const,
    queryFn: !projectId || !jobId ? skipToken : () => fetchJob({ projectId, jobId }),
    // kept fresh by the cache-sync code (JOB_UPDATED), useLiveJob polls while the websocket is down
    staleTime: Infinity,
  });

const jobsByProject = <TJob>(
  scope: readonly unknown[],
  projectId: number,
  fetchJobs: (projectId: number) => Promise<TJob[]>,
) =>
  queryOptions({
    queryKey: [...scope, projectId] as const,
    queryFn: () => fetchJobs(projectId),
    // kept fresh by the cache-sync code, which upserts every JOB_UPDATED into the list
    staleTime: Infinity,
  });

/**
 * Builds the queries of the background job of a domain, the `job` object of its query factory:
 *
 *   xQueries.job.all()                 [<domain>, "job"]
 *   xQueries.job.byId(projectId, jobId)  [<domain>, "job", "detail", jobId, projectId]
 *   xQueries.job.byProject(projectId)  [<domain>, "job", "project", projectId]     (only if the domain lists its jobs)
 *   xQueries.job.actions               abort and retry                              (only if the type generates them)
 *
 * Every job type has this shape, so the cache-sync code can handle all of them the same way. It writes every job
 * update into both caches, so they never go stale and are not refetched when a view mounts or the window gets focus.
 * @param root the root query key of the domain, i.e. what its `all()` returns (lint checks that they match)
 * @param actions the generated abort and retry endpoints of the job type, which JobListItem offers
 */
export function createJobQueries<TJob>(
  root: string,
  fetchJob: (job: JobRef) => Promise<TJob>,
): JobQueriesWithoutList<TJob>;
export function createJobQueries<TJob>(
  root: string,
  fetchJob: (job: JobRef) => Promise<TJob>,
  fetchJobs: (projectId: number) => Promise<TJob[]>,
  actions?: JobActions,
): JobQueriesWithList<TJob>;
export function createJobQueries<TJob>(
  root: string,
  fetchJob: (job: JobRef) => Promise<TJob>,
  fetchJobs?: (projectId: number) => Promise<TJob[]>,
  actions?: JobActions,
) {
  const all = () => [root, "job"] as const;
  const byId = (projectId: number | null | undefined, jobId: string | null | undefined) =>
    jobById([...all()], projectId, jobId, fetchJob);
  if (!fetchJobs) return { all, byId };

  const byProjectScope = () => [...all(), "project"] as const;
  const byProject = (projectId: number) => jobsByProject(byProjectScope(), projectId, fetchJobs);
  return { all, byId, byProjectScope, byProject, actions };
}

/**
 * Whether a query key belongs to the queries of a job type (`[<domain>, "job", ...]`, see createJobQueries), e.g. to
 * refresh the jobs of all types once the websocket opened, as they may have missed updates.
 */
export const isJobQueryKey = (queryKey: QueryKey) => queryKey[1] === "job";
