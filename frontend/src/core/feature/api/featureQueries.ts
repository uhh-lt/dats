import { FeatureService } from "@api/services/FeatureService";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for the toggleable features of DATS (the state of the features in a project is
 * `projectQueries.features`).
 *
 *   featureQueries.all()   ["feature"]
 *   featureQueries.list()  ["feature", "list"]
 */
export const featureQueries = {
  all: () => ["feature"] as const,

  // every toggleable feature with its title, description, area, the features it requires and whether a new project
  // enables it, ordered by area and title; fixed per DATS version
  list: () =>
    queryOptions({
      queryKey: [...featureQueries.all(), "list"] as const,
      queryFn: () => FeatureService.getAll(),
      staleTime: Infinity,
    }),
};
