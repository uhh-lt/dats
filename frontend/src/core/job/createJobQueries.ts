import { queryOptions, skipToken } from "@tanstack/react-query";

interface JobQueriesWithoutList<TJob> {
  all: () => readonly [string, "job"];
  byId: (jobId: string | null | undefined) => ReturnType<typeof jobById<TJob>>;
}

interface JobQueriesWithList<TJob> extends JobQueriesWithoutList<TJob> {
  byProjectScope: () => readonly [string, "job", "project"];
  byProject: (projectId: number) => ReturnType<typeof jobsByProject<TJob>>;
}

const jobById = <TJob>(
  scope: readonly unknown[],
  jobId: string | null | undefined,
  fetchJob: (jobId: string) => Promise<TJob>,
) =>
  queryOptions({
    queryKey: [...scope, "detail", jobId] as const,
    queryFn: !jobId ? skipToken : () => fetchJob(jobId),
  });

const jobsByProject = <TJob>(
  scope: readonly unknown[],
  projectId: number,
  fetchJobs: (projectId: number) => Promise<TJob[]>,
) =>
  queryOptions({
    queryKey: [...scope, projectId] as const,
    queryFn: () => fetchJobs(projectId),
  });

/**
 * Builds the queries of the background job of a domain, the `job` object of its query factory:
 *
 *   xQueries.job.all()                 [<domain>, "job"]
 *   xQueries.job.byId(jobId)           [<domain>, "job", "detail", jobId]
 *   xQueries.job.byProject(projectId)  [<domain>, "job", "project", projectId]     (only if the domain lists its jobs)
 *
 * Every job type has this shape, so the cache-sync code can handle all of them the same way.
 * @param root the root query key of the domain, i.e. what its `all()` returns (lint checks that they match)
 */
export function createJobQueries<TJob>(
  root: string,
  fetchJob: (jobId: string) => Promise<TJob>,
): JobQueriesWithoutList<TJob>;
export function createJobQueries<TJob>(
  root: string,
  fetchJob: (jobId: string) => Promise<TJob>,
  fetchJobs: (projectId: number) => Promise<TJob[]>,
): JobQueriesWithList<TJob>;
export function createJobQueries<TJob>(
  root: string,
  fetchJob: (jobId: string) => Promise<TJob>,
  fetchJobs?: (projectId: number) => Promise<TJob[]>,
) {
  const all = () => [root, "job"] as const;
  const byId = (jobId: string | null | undefined) => jobById([...all()], jobId, fetchJob);
  if (!fetchJobs) return { all, byId };

  const byProjectScope = () => [...all(), "project"] as const;
  const byProject = (projectId: number) => jobsByProject(byProjectScope(), projectId, fetchJobs);
  return { all, byId, byProjectScope, byProject };
}
