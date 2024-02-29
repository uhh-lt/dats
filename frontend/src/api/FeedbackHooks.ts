import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { FeedbackRead } from "./openapi/models/FeedbackRead.ts";
import { FeedbackService } from "./openapi/services/FeedbackService.ts";

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

const useGetUserFeedback = (userId: number | null | undefined) =>
  useQuery<FeedbackRead[], Error>({
    queryKey: [QueryKey.FEEDBACKS_USER, userId],
    queryFn: () => FeedbackService.getAllByUser({ userId: userId! }),
    enabled: !!userId,
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
