import { queryClient } from "@api/queryClient";
import { AnnoscalingService } from "@api/services/AnnoscalingService";
import { useMutation } from "@tanstack/react-query";
import { annoscalingQueries } from "./annoscalingQueries";

// QUERIES live in annoscalingQueries (used with `useQuery` directly).

const useConfirmSuggestions = () =>
  useMutation({
    mutationKey: [...annoscalingQueries.all(), "confirmSuggestions"],
    mutationFn: AnnoscalingService.confirmSuggestions,
    // The suggestions are computed for the user alone, so other clients don't need this: refresh them here.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: annoscalingQueries.suggestScope() }),
    meta: {
      datsEvent: "SPAN_ANNOTATION_CREATED_BATCH",
      successMessage: () => "Successfully confirmed annotation suggestions",
    },
  });

export const AnnoscalingHooks = {
  useConfirmSuggestions,
};
