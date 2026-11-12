import { projectQueries } from "@core/project";
import { Feature } from "@models/Feature";
import { ProjectRead } from "@models/ProjectRead";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { AnyRoute, useParams } from "@tanstack/react-router";
import { useCallback } from "react";

export interface FeatureCoverage {
  /** All documents the feature applies to have its data. */
  ready: boolean;
  /** Share of the documents the feature applies to that have its data, from 0 to 1. */
  coverage: number;
}

/** Features without a backend id (`undefined`) need core data only and are always enabled. */
function isEnabled(project: ProjectRead | undefined, feature: Feature | undefined): boolean {
  if (feature === undefined) return true;
  return project?.enabled_features.includes(feature) ?? false;
}

/** The id of the current project, if the current route is one of a project. */
function useCurrentProjectId(): number | undefined {
  return useParams({ strict: false, select: (params) => params.projectId });
}

/** The current project, from the projects of the user (`ProjectRead.enabled_features`). */
function useCurrentProject() {
  const projectId = useCurrentProjectId();
  return useQuery({
    ...projectQueries.userProjects(),
    select: (projects) => projects.find((project) => project.id === projectId),
    enabled: projectId !== undefined,
  });
}

/**
 * Whether a feature is enabled in the current project; disabled features are hidden. A gated feature counts as
 * disabled until the project is loaded.
 */
export function useFeature(feature: Feature | undefined): boolean {
  const { data } = useCurrentProject();
  return isEnabled(data, feature);
}

/** A predicate for lists of entries that each may name a feature (sidebar, commands, shortcuts). */
export function useIsFeatureEnabled(): (feature: Feature | undefined) => boolean {
  const { data } = useCurrentProject();
  return useCallback((feature: Feature | undefined) => isEnabled(data, feature), [data]);
}

/**
 * How many documents of the current project have the data of a feature. Loads the project features (an aggregate
 * over all documents) only where it is used; undefined while they load.
 */
export function useFeatureCoverage(feature: Feature): FeatureCoverage | undefined {
  const projectId = useCurrentProjectId();
  const { data } = useQuery({ ...projectQueries.features(projectId ?? -1), enabled: projectId !== undefined });
  const state = data?.[feature];
  if (!state) return undefined;
  return {
    ready: state.ready,
    coverage: state.total_documents === 0 ? 1 : state.covered_documents / state.total_documents,
  };
}

/** Loads the projects of the user and tells whether the feature is enabled in the project. */
export async function ensureFeatureEnabled(
  queryClient: QueryClient,
  projectId: number,
  feature: Feature,
): Promise<boolean> {
  const projects = await queryClient.ensureQueryData(projectQueries.userProjects());
  return isEnabled(
    projects.find((project) => project.id === projectId),
    feature,
  );
}

interface FeatureRouteLoaderArgs {
  context: { queryClient: QueryClient };
  params: { projectId: number };
  route: AnyRoute;
}

/**
 * The feature of a route: the one it declares (`staticData.feature`), else the one of its nearest parent route that
 * declares one, so the routes below a feature's route (its detail pages) need not repeat it.
 */
export function getRouteFeature(route: AnyRoute): Feature | undefined {
  for (let current: AnyRoute | undefined = route; current; current = current.parentRoute) {
    const feature = current.options.staticData?.feature;
    if (feature !== undefined) return feature;
  }
  return undefined;
}

/**
 * For the loader of a page with a feature (`getRouteFeature`): tells whether that feature is enabled. The loader skips
 * its queries for a disabled feature (they would fail with 403); the project layout then shows the "not enabled" view
 * instead of the page.
 */
export async function ensureRouteFeatureEnabled({ context, params, route }: FeatureRouteLoaderArgs): Promise<boolean> {
  const feature = getRouteFeature(route);
  if (feature === undefined) return true;
  return ensureFeatureEnabled(context.queryClient, params.projectId, feature);
}
