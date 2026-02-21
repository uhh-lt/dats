import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../plugins/ReactQueryClient.ts";
import { AnnoscalingResult } from "./openapi/models/AnnoscalingResult.ts";
import { AnnoscalingService } from "./openapi/services/AnnoscalingService.ts";
import { QueryKey } from "./QueryKey.ts";

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
