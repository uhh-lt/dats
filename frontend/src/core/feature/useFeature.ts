import { ProjectFeatureMap, projectQueries } from "@core/project";
import { Feature } from "@models/Feature";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { featureQueries } from "./api/featureQueries";
import { getFeatureTitle } from "./featureRegistry";

export interface FeatureState {
  /** The feature is enabled in the current project; disabled features are hidden. */
  enabled: boolean;
  /** All documents the feature applies to have its data. */
  ready: boolean;
  /** Share of the documents the feature applies to that have its data, from 0 to 1. */
  coverage: number;
}

const ALWAYS_AVAILABLE: FeatureState = { enabled: true, ready: true, coverage: 1 };
const UNKNOWN: FeatureState = { enabled: false, ready: false, coverage: 0 };

function toFeatureState(features: ProjectFeatureMap | undefined, feature: Feature | undefined): FeatureState {
  if (feature === undefined) return ALWAYS_AVAILABLE;
  const state = features?.[feature];
  if (!state) return UNKNOWN;
  return {
    enabled: state.enabled,
    ready: state.ready,
    coverage: state.total_documents === 0 ? 1 : state.covered_documents / state.total_documents,
  };
}

/** The project features of the current project; the project layout route has loaded them. */
function useProjectFeatures() {
  const projectId = useParams({ strict: false, select: (params) => params.projectId });
  return useQuery({ ...projectQueries.features(projectId ?? -1), enabled: projectId !== undefined });
}

/**
 * The state of a feature in the current project. Features without a backend id (`undefined`) need core data only and
 * are always available; a gated feature counts as disabled until the project features are loaded.
 */
export function useFeature(feature: Feature | undefined): FeatureState {
  const { data } = useProjectFeatures();
  return toFeatureState(data, feature);
}

/** A predicate for lists of entries that each may name a feature (sidebar, commands, shortcuts). */
export function useIsFeatureEnabled(): (feature: Feature | undefined) => boolean {
  const { data } = useProjectFeatures();
  return useCallback((feature: Feature | undefined) => toFeatureState(data, feature).enabled, [data]);
}

/**
 * For route loaders of gated pages: loads the project features and tells whether the feature is enabled. A loader
 * skips its queries for a disabled feature (they would fail with 403); the project layout then shows the
 * "not enabled" view instead of the page.
 */
export async function ensureFeatureEnabled(
  queryClient: QueryClient,
  projectId: number,
  feature: Feature,
): Promise<boolean> {
  const features = await queryClient.ensureQueryData(projectQueries.features(projectId));
  return toFeatureState(features, feature).enabled;
}

/**
 * The user-facing title of a gated feature, as the backend declares it (the titles of the Features tab); the registry
 * title while the features are loading. Features without a page of their own (e.g. full-text search) have no registry
 * entry.
 */
export function useFeatureTitle(feature: Feature): string {
  const { data } = useQuery(featureQueries.list());
  return data?.find((f) => f.feature === feature)?.title ?? getFeatureTitle(feature);
}
