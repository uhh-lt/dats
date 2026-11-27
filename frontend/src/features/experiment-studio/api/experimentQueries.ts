import { ExperimentsService } from "@api/services/ExperimentsService";
import type { ExperimentRead } from "@models/ExperimentRead";
import { queryOptions } from "@tanstack/react-query";

export type ExperimentMap = Record<number, ExperimentRead>;

/**
 * Query factory for the experiments of the Experiment Studio (with their runs).
 *
 *   experimentQueries.all()                    ["experiment"]
 *   experimentQueries.projectScope(projectId)  ["experiment", "project", projectId]
 *   experimentQueries.byProject(projectId)     ["experiment", "project", projectId]
 *
 * The run jobs are followed through JOB_UPDATED events, which refresh the experiments (see cache-sync).
 */
export const experimentQueries = {
  all: () => ["experiment"] as const,
  // prefix of all experiment queries of one project
  projectScope: (projectId: number) => [...experimentQueries.all(), "project", projectId] as const,

  // all experiments of a project with their runs, as a map by id
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: experimentQueries.projectScope(projectId),
      queryFn: async () => {
        const data = await ExperimentsService.getByProject({ projectId });
        return data.reduce<ExperimentMap>((acc, experiment) => {
          acc[experiment.id] = experiment;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),
};
