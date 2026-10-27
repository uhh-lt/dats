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

  // scores, confusion matrix and segments of two annotators (not cached across annotation changes)
  computeScope: () => [...agreementQueries.all(), "compute"] as const,
  compute: (projectId: number | undefined, params: AgreementParams | undefined) =>
    queryOptions({
      queryKey: [...agreementQueries.computeScope(), projectId, params] as const,
      queryFn:
        projectId === undefined || params === undefined
          ? skipToken
          : () => AgreementService.computeAgreement({ projectId, requestBody: params }),
    }),
};
