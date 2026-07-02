import { MlJobRead } from "@models/MlJobRead";
import { TagRecommendationResult } from "@models/TagRecommendationResult";
import { queryClient } from "@api/queryClient";
import { TagRecommendationService } from "@api/services/TagRecommendationService";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// TAG RECOMMENDATION QUERIES
const useGetAllTagRecommendationJobs = () => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery<MlJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_TAG_RECOMMENDATION_JOBS, projectId],
    queryFn: () => {
      return [];
      // TODO: FIX ME!!!
      // TagRecommendationService.getAllTagrecommendationJobs({
      //   projectId: projectId!,
      // })
    },

    enabled: !!projectId,
  });
};

const useGetTagRecommendationsFromJob = (mlJobId: string | null | undefined) =>
  useQuery<TagRecommendationResult[], Error>({
    queryKey: [QueryKey.TAG_RECOMMENDATIONS, mlJobId],
    queryFn: () =>
      TagRecommendationService.getAllTagrecommendationsFromJob({
        mlJobId: mlJobId!,
      }),
    staleTime: 1000 * 60 * 5,
    enabled: !!mlJobId,
  });

// TAG RECOMMENDATION MUTATIONS
const useReviewTagRecommendations = () =>
  useMutation({
    mutationFn: TagRecommendationService.updateRecommendations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_RECOMMENDATIONS] });
    },
    meta: {
      successMessage: () => `Reviewed tags!`,
    },
  });

export const TagRecommendationHooks = {
  useGetAllTagRecommendationJobs,
  useGetTagRecommendationsFromJob,
  useReviewTagRecommendations,
};
