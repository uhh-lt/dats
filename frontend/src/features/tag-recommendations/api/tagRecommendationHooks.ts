import { JobService } from "@api/services/JobService";
import { TagRecommendationService } from "@api/services/TagRecommendationService";
import { TagRecommendationJobRead } from "@models/TagRecommendationJobRead";
import { useMutation } from "@tanstack/react-query";
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

const useStartTagRecommendationJob = () =>
  useMutation({
    mutationKey: [...tagRecommendationQueries.job.all(), "start"],
    mutationFn: JobService.startTagRecommendationJob,
    meta: {
      datsEvent: "JOB_UPDATED",
      successMessage: (data: TagRecommendationJobRead) => `Started the tag recommendation (job ${data.job_id})`,
    },
  });

export const TagRecommendationHooks = {
  useReviewTagRecommendations,
  useStartTagRecommendationJob,
};
