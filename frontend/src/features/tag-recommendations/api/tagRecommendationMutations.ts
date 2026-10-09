import { queryClient } from "@api/queryClient";
import { TagRecommendationService } from "@api/services/TagRecommendationService";
import { useMutation } from "@tanstack/react-query";
import { tagRecommendationQueries } from "./tagRecommendationQueries";

// TAG RECOMMENDATION QUERIES live in tagRecommendationQueries (used with `useQuery` directly).

// TAG RECOMMENDATION MUTATIONS
export const useReviewTagRecommendations = () =>
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
