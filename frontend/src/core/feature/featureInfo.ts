import { FeatureRead } from "@models/FeatureRead";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { featureQueries } from "./api/featureQueries";

export interface FeatureInfo {
  /** The one title of the feature, also of its page (sidebar, analysis dashboard, commands, shortcuts, tab). */
  title: string;
  description: string;
}

const reportedMissing = new Set<string>();

/** The feature of this name in the backend list; logs once if the loaded list lacks it. */
function findFeature(features: readonly FeatureRead[] | undefined, feature: string): FeatureRead | undefined {
  const found = features?.find((f) => f.feature === feature);
  if (features !== undefined && found === undefined && !reportedMissing.has(feature)) {
    reportedMissing.add(feature);
    console.error(`The backend does not list the feature '${feature}' (GET /feature).`);
  }
  return found;
}

function toInfo(found: FeatureRead | undefined, feature: string): FeatureInfo {
  return { title: found?.title ?? feature, description: found?.description ?? "" };
}

/** The title and description of a feature, from the backend (`featureQueries.list()`), with its name as fallback. */
export function useFeatureInfo(feature: string): FeatureInfo {
  const { data } = useQuery(featureQueries.list());
  return toInfo(findFeature(data, feature), feature);
}

/**
 * The title of a feature outside of React (mutation messages, tab titles), from the cached `featureQueries.list()`
 * that the project route loader ensures, with its name as fallback.
 */
export function featureTitle(queryClient: QueryClient, feature: string): string {
  return toInfo(findFeature(queryClient.getQueryData(featureQueries.list().queryKey), feature), feature).title;
}
