import { queryClient } from "@api/queryClient";
import { TagRecommendationService } from "@api/services/TagRecommendationService";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { tagRecommendationQueries } from "./tagRecommendationQueries";

// TAG RECOMMENDATION QUERIES live in tagRecommendationQueries (used with `useQuery` directly).

// TAG RECOMMENDATION MUTATIONS
const useReviewTagRecommendations = () =>
  useMutation({
    mutationKey: [...tagRecommendationQueries.all(), "reviewTagRecommendations"],
    mutationFn: TagRecommendationService.updateRecommendations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagRecommendationQueries.all() });
    },
    meta: {
      successMessage: () => `Reviewed tags!`,
    },
  });

const useGetAllTagRecommendationJobs = () => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery(tagRecommendationQueries.jobsByProject(projectId));
};

const useGetTagRecommendationsFromJob = (mlJobId: string | null | undefined) =>
  useQuery(tagRecommendationQueries.byJob(mlJobId));

export const TagRecommendationHooks = {
  useReviewTagRecommendations,
  useGetAllTagRecommendationJobs,
  useGetTagRecommendationsFromJob,
};
