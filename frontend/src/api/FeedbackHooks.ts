import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { FeedbackCreate, FeedbackRead, FeedbackService } from "./openapi";
import { QueryKey } from "./QueryKey";

const useCreateFeedback = (options: UseMutationOptions<FeedbackRead, Error, { requestBody: FeedbackCreate }>) =>
  useMutation(FeedbackService.createFeedbackFeedbackPut, options);

const useGetFeedback = (feedbackId: string) =>
  useQuery<FeedbackRead, Error>(
    [QueryKey.FEEDBACK, feedbackId],
    () => FeedbackService.getByIdFeedbackFeedbackIdGet({ feedbackId: feedbackId! }),
    {
      enabled: !!feedbackId && feedbackId.length > 0,
    }
  );

const useGetAllFeedback = () =>
  useQuery<FeedbackRead[], Error>([QueryKey.FEEDBACKS], () => FeedbackService.getAllFeedbackGet());

const FeedbackHooks = {
  useCreateFeedback,
  useGetFeedback,
  useGetAllFeedback,
};

export default FeedbackHooks;
