import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { DocumentTagRecommendationResult } from "./openapi/models/DocumentTagRecommendationResult.ts";
import { MLJobRead } from "./openapi/models/MLJobRead.ts";
import { DocumentTagRecommendationService } from "./openapi/services/DocumentTagRecommendationService.ts";

// TAG RECOMMENDATION QUERIES
const useGetAllTagRecommendationJobs = () => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery<MLJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_TAG_RECOMMENDATION_JOBS, projectId],
    queryFn: () =>
      DocumentTagRecommendationService.getAllDoctagrecommendationJobs({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

const useGetTagRecommendationsFromJob = (mlJobId: string | null | undefined) =>
  useQuery<DocumentTagRecommendationResult[], Error>({
    queryKey: [QueryKey.TAG_RECOMMENDATIONS, mlJobId],
    queryFn: () =>
      DocumentTagRecommendationService.getAllDoctagrecommendationsFromJob({
        mlJobId: mlJobId!,
      }),
    staleTime: 1000 * 60 * 5,
    enabled: !!mlJobId,
  });

// TAG RECOMMENDATION MUTATIONS
const useReviewTagRecommendations = () =>
  useMutation({
    mutationFn: DocumentTagRecommendationService.updateRecommendations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_RECOMMENDATIONS] });
    },
    meta: {
      successMessage: () => `Reviewed tags!`,
    },
  });

const TagRecommendationHooks = {
  useGetAllTagRecommendationJobs,
  useGetTagRecommendationsFromJob,
  useReviewTagRecommendations,
};

export default TagRecommendationHooks;
