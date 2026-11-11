import { queryClient } from "@api/queryClient";
import { FeatureService } from "@api/services/FeatureService";
import { projectQueries } from "@core/project";
import { Feature } from "@models/Feature";
import { useMutation } from "@tanstack/react-query";
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

// The title the backend declares for the feature (`featureQueries.list()`, loaded by every view that changes features).
const featureTitle = (feature: Feature) =>
  queryClient.getQueryData(featureQueries.list().queryKey)?.find((f) => f.feature === feature)?.title ?? feature;

const useActivateFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "activateFeature"],
    mutationFn: FeatureService.activateFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) =>
        `Started computing ${featureTitle(feature)}`,
    },
  });

const useDisableFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "disableFeature"],
    mutationFn: FeatureService.disableFeature,
    onSuccess: (enabledFeatures, { projectId }) => refreshProjectFeatures(projectId, enabledFeatures),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) => `Disabled ${featureTitle(feature)}`,
    },
  });

export const FeatureHooks = {
  useActivateFeature,
  useDisableFeature,
};
