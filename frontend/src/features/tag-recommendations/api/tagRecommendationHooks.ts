import { JobsService } from "@api/services/JobsService";
import { TagRecommendationsService } from "@api/services/TagRecommendationsService";
import { TagRecommendationJobRead } from "@models/TagRecommendationJobRead";
import { useMutation } from "@tanstack/react-query";
import { tagRecommendationQueries } from "./tagRecommendationQueries";

// TAG RECOMMENDATION QUERIES live in tagRecommendationQueries (used with `useQuery` directly).

// TAG RECOMMENDATION MUTATIONS
const useReviewTagRecommendations = () =>
  useMutation({
    mutationKey: [...tagRecommendationQueries.all(), "reviewTagRecommendations"],
    mutationFn: TagRecommendationsService.updateRecommendations,
    meta: {
      datsEvent: "TAG_RECOMMENDATION_REVIEWED_BATCH",
      successMessage: () => `Reviewed tags!`,
    },
  });

const useStartTagRecommendationJob = () =>
  useMutation({
    mutationKey: [...tagRecommendationQueries.job.all(), "start"],
    mutationFn: JobsService.startTagRecommendationJob,
    meta: {
      datsEvent: "JOB_UPDATED",
      successMessage: (data: TagRecommendationJobRead) => `Started the tag recommendation (job ${data.job_id})`,
    },
  });

export const TagRecommendationHooks = {
  useReviewTagRecommendations,
  useStartTagRecommendationJob,
};
