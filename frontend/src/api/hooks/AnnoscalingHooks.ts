import { queryClient } from "@api/queryClient";
import { AnnoscalingService } from "@api/services/AnnoscalingService";
import { AnnoscalingResult } from "@models/AnnoscalingResult";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

const useAnnotationSuggestions = (projectId: number, codeId?: number, antiCodeId?: number) =>
  useQuery<AnnoscalingResult[], Error>({
    queryKey: [QueryKey.ANNOSCALING_SUGGEST, projectId, codeId, antiCodeId],
    enabled: !!codeId && !!antiCodeId,
    queryFn: () =>
      AnnoscalingService.suggest({
        requestBody: { code_id: codeId!, project_id: projectId, reject_cide_id: antiCodeId!, top_k: 10 },
      }),
  });

const useConfirmSuggestions = () =>
  useMutation({
    mutationFn: AnnoscalingService.confirmSuggestions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOSCALING_SUGGEST] }),
    meta: {
      successMessage: () => "Successfully confirmed annotation suggestions",
    },
  });

export const AnnoscalingHooks = {
  useAnnotationSuggestions,
  useConfirmSuggestions,
};
