import { queryClient } from "@api/queryClient";
import { AnnoscalingService } from "@api/services/AnnoscalingService";
import { useMutation } from "@tanstack/react-query";
import { annoscalingQueries } from "./annoscalingQueries";

// QUERIES live in annoscalingQueries (used with `useQuery` directly).

const useConfirmSuggestions = () =>
  useMutation({
    mutationKey: [...annoscalingQueries.all(), "confirmSuggestions"],
    mutationFn: AnnoscalingService.confirmSuggestions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: annoscalingQueries.suggestScope() }),
    meta: {
      successMessage: () => "Successfully confirmed annotation suggestions",
    },
  });

export const AnnoscalingHooks = {
  useConfirmSuggestions,
};
