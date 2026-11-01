import { ExperimentService } from "@api/services/ExperimentService";
import type { ExperimentRead } from "@models/ExperimentRead";
import { queryOptions } from "@tanstack/react-query";

export type ExperimentMap = Record<number, ExperimentRead>;

/**
 * Query factory for the experiments of the Experiment Studio (with their runs).
 *
 *   experimentQueries.all()                  ["experiment"]
 *   experimentQueries.byProject(projectId)   ["experiment", "project", projectId]
 *
 * The run jobs are followed through JOB_UPDATED events, which refresh the experiments (see cache-sync).
 */
export const experimentQueries = {
  all: () => ["experiment"] as const,

  // all experiments of a project with their runs, as a map by id
  byProjectScope: () => [...experimentQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...experimentQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const data = await ExperimentService.getByProject({ projectId });
        return data.reduce<ExperimentMap>((acc, experiment) => {
          acc[experiment.id] = experiment;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),
};
