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
    meta: {
      datsEvent: "TAG_RECOMMENDATION_REVIEWED_BATCH",
      successMessage: () => `Reviewed tags!`,
    },
  });

const useGetAllTagRecommendationJobs = () => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery(tagRecommendationQueries.jobsByProject(projectId));
};

export const TagRecommendationHooks = {
  useReviewTagRecommendations,
  useGetAllTagRecommendationJobs,
};
