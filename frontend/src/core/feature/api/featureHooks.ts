import { queryClient } from "@api/queryClient";
import { FeatureService } from "@api/services/FeatureService";
import { codeQueries } from "@core/code";
import { projectQueries } from "@core/project";
import { useMutation } from "@tanstack/react-query";
import { featureTitle } from "../featureInfo";
import { featureQueries } from "./featureQueries";

// The backend sends PROJECT_UPDATED to the other members only (the actor has the response): store the enabled features
// in the project and refresh the state of the features here.
const refreshProjectFeatures = (projectId: number, enabledFeatures: string[]) => {
  queryClient.setQueryData(projectQueries.userProjects().queryKey, (projects) =>
    projects?.map((project) =>
      project.id === projectId ? { ...project, enabled_features: enabledFeatures } : project,
    ),
  );
  queryClient.invalidateQueries({ queryKey: projectQueries.features(projectId).queryKey });
};

// a 409 (the action is not allowed in the feature's status) means the shown state is stale: refetch it to show the
// allowed actions
const refetchProjectFeatures = (projectId: number) =>
  queryClient.invalidateQueries({ queryKey: projectQueries.features(projectId).queryKey });

const useEnableFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "enableFeature"],
    mutationFn: FeatureService.enable,
    onSuccess: (enabledFeatures, { projectId }) => {
      refreshProjectFeatures(projectId, enabledFeatures);
      // Enable creates the system codes of the feature (the set up), which send no code events
      queryClient.invalidateQueries({ queryKey: codeQueries.byProject(projectId).queryKey });
    },
    onError: (_error, { projectId }) => refetchProjectFeatures(projectId),
    meta: {
      successMessage: (_data: string[], { feature }: { feature: string }) =>
        `Started computing ${featureTitle(queryClient, feature)}`,
      errorMessage: (_error: Error, { feature }: { feature: string }) =>
        `Could not enable ${featureTitle(queryClient, feature)}`,
    },
  });

const useCompleteFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "completeFeature"],
    mutationFn: FeatureService.complete,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    onError: (_error, { projectId }) => refetchProjectFeatures(projectId),
    meta: {
      successMessage: (_data: string[], { feature }: { feature: string }) =>
        `Started computing ${featureTitle(queryClient, feature)}`,
      errorMessage: (_error: Error, { feature }: { feature: string }) =>
        `Could not complete ${featureTitle(queryClient, feature)}`,
    },
  });

const useDisableFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "disableFeature"],
    mutationFn: FeatureService.disable,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    onError: (_error, { projectId }) => refetchProjectFeatures(projectId),
    meta: {
      successMessage: (_data: string[], { feature }: { feature: string }) =>
        `Disabled ${featureTitle(queryClient, feature)}`,
      errorMessage: (_error: Error, { feature }: { feature: string }) =>
        `Could not disable ${featureTitle(queryClient, feature)}`,
    },
  });

export const FeatureHooks = {
  useEnableFeature,
  useCompleteFeature,
  useDisableFeature,
};
