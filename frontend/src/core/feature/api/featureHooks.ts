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

const useActivateFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "activateFeature"],
    mutationFn: FeatureService.activateFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    // a 409 (the feature is computing already) means the shown state is stale: refetch it to offer Restart
    onError: (_error, { projectId }) =>
      queryClient.invalidateQueries({ queryKey: projectQueries.features(projectId).queryKey }),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) =>
        `Started computing ${FEATURES[feature].title}`,
      errorMessage: (_error: Error, { feature }: { feature: Feature }) =>
        `Could not compute ${FEATURES[feature].title}`,
    },
  });

const useRestartFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "restartFeature"],
    mutationFn: FeatureService.restartFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) =>
        `Restarted computing ${FEATURES[feature].title}`,
    },
  });

const useDisableFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "disableFeature"],
    mutationFn: FeatureService.disableFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) => `Disabled ${FEATURES[feature].title}`,
    },
  });

export const FeatureHooks = {
  useActivateFeature,
  useRestartFeature,
  useDisableFeature,
};
