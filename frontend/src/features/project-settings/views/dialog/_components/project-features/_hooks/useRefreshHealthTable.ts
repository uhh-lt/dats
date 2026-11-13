// eslint-disable-next-line boundaries/element-types
import { healthQueries } from "@features/health";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Refreshes the document health table after a feature change planned or unplanned steps: the steps send no events, and
 * the table is cached for minutes.
 */
export function useRefreshHealthTable() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: healthQueries.searchScope() }), [queryClient]);
}
