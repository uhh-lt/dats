import { sdocQueries } from "@core/source-document";
import { useQueries, UseQueryResult } from "@tanstack/react-query";

interface AgreementSdocIds {
  /** The ids of all documents that carry at least one of the tags; undefined while loading. */
  sdocIds: number[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

const combineSdocIds = (results: UseQueryResult<number[]>[]): AgreementSdocIds => ({
  sdocIds: results.every((result) => result.isSuccess)
    ? Array.from(new Set(results.flatMap((result) => result.data ?? []))).sort((a, b) => a - b)
    : undefined,
  isLoading: results.some((result) => result.isLoading),
  isError: results.some((result) => result.isError),
});

/** The documents to compare: every document that carries at least one of the tags. */
export function useAgreementSdocIds(tagIds: number[]): AgreementSdocIds {
  return useQueries({
    queries: tagIds.map((tagId) => sdocQueries.idsByTag(tagId)),
    combine: combineSdocIds,
  });
}
