import { AgreementService } from "@api/services/AgreementService";
import { AgreementParams } from "@models/AgreementParams";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the agreement evaluation between two annotators.
 *
 *   agreementQueries.all()                       ["agreement"]
 *   agreementQueries.compute(projectId, params)  ["agreement", "compute", projectId, params]
 */
export const agreementQueries = {
  all: () => ["agreement"] as const,

  // scores, confusion matrix and segments of two annotators. Annotation changes only mark the
  // result as stale (see cache-sync/brain.ts); it is recomputed on request (refetch), so the
  // result stays stable while its segments are reviewed.
  computeScope: () => [...agreementQueries.all(), "compute"] as const,
  compute: (projectId: number | undefined, params: AgreementParams | undefined) =>
    queryOptions({
      queryKey: [...agreementQueries.computeScope(), projectId, params] as const,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      queryFn:
        projectId === undefined || params === undefined
          ? skipToken
          : () => AgreementService.computeAgreement({ projectId, requestBody: params }),
    }),
};
