import { queryClient } from "@api/queryClient";
import { FeatureService } from "@api/services/FeatureService";
import { projectQueries } from "@core/project";
import { Feature } from "@models/Feature";
import { useMutation } from "@tanstack/react-query";
import { featureQueries } from "./featureQueries";

// The backend sends no DATS event when the features of a project change: refresh the project (its enabled features)
// and the state of its features here.
const refreshProjectFeatures = (projectId: number) => {
  queryClient.invalidateQueries({ queryKey: projectQueries.features(projectId).queryKey });
  queryClient.invalidateQueries({ queryKey: projectQueries.userProjects().queryKey });
};

// The title the backend declares for the feature (`featureQueries.list()`, loaded by every view that changes features).
const featureTitle = (feature: Feature) =>
  queryClient.getQueryData(featureQueries.list().queryKey)?.find((f) => f.feature === feature)?.title ?? feature;

const useActivateFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "activateFeature"],
    mutationFn: FeatureService.activateFeature,
    onSuccess: (_data, { projectId }) => refreshProjectFeatures(projectId),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) =>
        `Started computing ${featureTitle(feature)}`,
    },
  });

const useDisableFeature = () =>
  useMutation({
    mutationKey: [...featureQueries.all(), "disableFeature"],
    mutationFn: FeatureService.disableFeature,
    onSuccess: (_data, { projectId }) => refreshProjectFeatures(projectId),
    meta: {
      successMessage: (_data: Feature[], { feature }: { feature: Feature }) => `Disabled ${featureTitle(feature)}`,
    },
  });

export const FeatureHooks = {
  useActivateFeature,
  useDisableFeature,
};
