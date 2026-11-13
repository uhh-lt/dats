import { queryClient } from "@api/queryClient";
import { FeatureService } from "@api/services/FeatureService";
import { projectQueries } from "@core/project";
import { Feature } from "@models/Feature";
import { useMutation } from "@tanstack/react-query";
import { FEATURES } from "../features";
import { featureQueries } from "./featureQueries";

// The backend sends PROJECT_UPDATED to the other members only (the actor has the response): store the enabled features
// in the project and refresh the state of the features here.
const refreshProjectFeatures = (projectId: number, enabledFeatures: Feature[]) => {
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
    mutationFn: FeatureService.enableFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    onError: (_error, { projectId }) => refetchProjectFeatures(projectId),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) =>
        `Started computing ${FEATURES[feature].title}`,
      errorMessage: (_error: Error, { feature }: { feature: Feature }) => `Could not enable ${FEATURES[feature].title}`,
    },
  });

const useCompleteFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "completeFeature"],
    mutationFn: FeatureService.completeFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    onError: (_error, { projectId }) => refetchProjectFeatures(projectId),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) =>
        `Started computing ${FEATURES[feature].title}`,
      errorMessage: (_error: Error, { feature }: { feature: Feature }) =>
        `Could not complete ${FEATURES[feature].title}`,
    },
  });

const useDisableFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "disableFeature"],
    mutationFn: FeatureService.disableFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    onError: (_error, { projectId }) => refetchProjectFeatures(projectId),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) => `Disabled ${FEATURES[feature].title}`,
      errorMessage: (_error: Error, { feature }: { feature: Feature }) =>
        `Could not disable ${FEATURES[feature].title}`,
    },
  });

export const FeatureHooks = {
  useEnableFeature,
  useCompleteFeature,
  useDisableFeature,
};
