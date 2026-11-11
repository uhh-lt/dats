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

  // every toggleable feature with the features it requires (its display text is in `FEATURES`); fixed per DATS version
  list: () =>
    queryOptions({
      queryKey: [...featureQueries.all(), "list"] as const,
      queryFn: () => FeatureService.getAll(),
      staleTime: Infinity,
    }),
};
