import { FeatureService } from "@api/services/FeatureService";
import { FeatureRead } from "@models/FeatureRead";
import { queryOptions } from "@tanstack/react-query";
import { Feature } from "../features";

/** Reports every frontend feature (`Feature`) the backend does not list, e.g. a typo in a gate or a removed feature. */
function reportMissingFeatures(features: readonly FeatureRead[]): void {
  const listed = new Set(features.map((feature) => feature.feature));
  for (const name of Object.values(Feature)) {
    if (!listed.has(name)) {
      console.error(`The backend does not list the feature '${name}' (GET /feature), which the frontend gates on.`);
    }
  }
}

/**
 * Query factory for the toggleable features of DATS (the state of the features in a project is
 * `projectQueries.features`).
 *
 *   featureQueries.all()   ["feature"]
 *   featureQueries.list()  ["feature", "list"]
 */
export const featureQueries = {
  all: () => ["feature"] as const,

  // every toggleable feature with its title, description, area and whether a new project enables it, ordered by area
  // and title; fixed per DATS version
  list: () =>
    queryOptions({
      queryKey: [...featureQueries.all(), "list"] as const,
      queryFn: async () => {
        const features = await FeatureService.getAll();
        reportMissingFeatures(features);
        return features;
      },
      staleTime: Infinity,
    }),
};
