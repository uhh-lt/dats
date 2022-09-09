import { useMutation, useQuery } from "@tanstack/react-query";
import { FeedbackRead, FeedbackService } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

const useCreateFeedback = () =>
  useMutation(FeedbackService.createFeedbackFeedbackPut, {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.FEEDBACKS]);
    },
  });

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
