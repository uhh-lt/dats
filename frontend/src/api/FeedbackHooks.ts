import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { FeedbackRead } from "./openapi/models/FeedbackRead.ts";
import { FeedbackService } from "./openapi/services/FeedbackService.ts";
import { QueryKey } from "./QueryKey.ts";

const useCreateFeedback = () =>
  useMutation({
    mutationFn: FeedbackService.createFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.FEEDBACKS] });
    },
  });

const useGetFeedback = (feedbackId: string) =>
  useQuery<FeedbackRead, Error>({
    queryKey: [QueryKey.FEEDBACK, feedbackId],
    queryFn: () => FeedbackService.getById({ feedbackId: feedbackId! }),
    enabled: !!feedbackId && feedbackId.length > 0,
  });

const useGetAllFeedback = () =>
  useQuery<FeedbackRead[], Error>({ queryKey: [QueryKey.FEEDBACKS], queryFn: () => FeedbackService.getAll() });

const useGetUserFeedback = () =>
  useQuery<FeedbackRead[], Error>({
    queryKey: [QueryKey.FEEDBACKS_USER],
    queryFn: () => FeedbackService.getAll(),
  });

const useReplyTo = () => useMutation({ mutationFn: FeedbackService.replyTo });

const FeedbackHooks = {
  useCreateFeedback,
  useGetFeedback,
  useGetAllFeedback,
  useGetUserFeedback,
  useReplyTo,
};

export default FeedbackHooks;
