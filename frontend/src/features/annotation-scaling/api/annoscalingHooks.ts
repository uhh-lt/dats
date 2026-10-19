import { handleAnnoscalingSuggestionsConfirmed } from "@api/cache-sync";
import { AnnoscalingService } from "@api/services/AnnoscalingService";
import { useMutation } from "@tanstack/react-query";
import { annoscalingQueries } from "./annoscalingQueries";

// QUERIES live in annoscalingQueries (used with `useQuery` directly).

const useConfirmSuggestions = () =>
  useMutation({
    mutationKey: [...annoscalingQueries.all(), "confirmSuggestions"],
    mutationFn: AnnoscalingService.confirmSuggestions,
    onSuccess: handleAnnoscalingSuggestionsConfirmed,
    meta: {
      successMessage: () => "Successfully confirmed annotation suggestions",
    },
  });

export const AnnoscalingHooks = {
  useConfirmSuggestions,
};
