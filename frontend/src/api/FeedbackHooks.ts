import { useMutation, useQuery } from "@tanstack/react-query";
import { FeedbackRead, FeedbackService } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

const useCreateFeedback = () =>
  useMutation(FeedbackService.createFeedback, {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.FEEDBACKS]);
    },
  });

const useGetFeedback = (feedbackId: string) =>
  useQuery<FeedbackRead, Error>(
    [QueryKey.FEEDBACK, feedbackId],
    () => FeedbackService.getById({ feedbackId: feedbackId! }),
    {
      enabled: !!feedbackId && feedbackId.length > 0,
    },
  );

const useGetAllFeedback = () => useQuery<FeedbackRead[], Error>([QueryKey.FEEDBACKS], () => FeedbackService.getAll());

const useGetUserFeedback = (userId: number | undefined) =>
  useQuery<FeedbackRead[], Error>([QueryKey.FEEDBACKS_USER], () => FeedbackService.getAllByUser({ userId: userId! }), {
    enabled: !!userId,
  });

const useReplyTo = () => useMutation(FeedbackService.replyTo);

const FeedbackHooks = {
  useCreateFeedback,
  useGetFeedback,
  useGetAllFeedback,
  useGetUserFeedback,
  useReplyTo,
};

export default FeedbackHooks;
