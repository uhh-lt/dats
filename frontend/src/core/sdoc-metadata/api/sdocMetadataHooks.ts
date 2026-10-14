import { SdocMetadataService } from "@api/services/SdocMetadataService";
import { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { useMutation, useQueries, useQuery, UseQueryResult } from "@tanstack/react-query";
import { SdocMetadataMap, sdocMetadataQueries } from "./sdocMetadataQueries";

// SDOC METADATA QUERIES

const useGetSdocMetadata = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocMetadataQueries.bySdoc(sdocId),
    select: (data) => Object.values(data),
  });

const useGetSdocMetadataByProjectMetadataId = (sdocId: number | null | undefined, projectMetadataId: number) =>
  useQuery({
    ...sdocMetadataQueries.bySdoc(sdocId),
    select: (data) => data[projectMetadataId],
  });

export type SourceDocumentMetadataReadCombined = Omit<SourceDocumentMetadataRead, "id" | "source_document_id"> & {
  ids: number[];
};

// referential stability for bulk queries
const combineBulkData = (results: UseQueryResult<SdocMetadataMap, Error>[]) => {
  const isSuccess = results.every((result) => result.isSuccess);

  let data: SourceDocumentMetadataReadCombined[] | undefined = undefined;
  if (isSuccess) {
    // Aggregate all SourceDocumentMetadataRead objects by project_metadata_id
    const combinedMap: Record<number, SourceDocumentMetadataRead[]> = {};
    results.forEach((result) => {
      Object.entries(result.data).forEach(([projectMetadataId, metadata]) => {
        const pmid = Number(projectMetadataId);
        if (!combinedMap[pmid]) {
          combinedMap[pmid] = [metadata];
        } else {
          combinedMap[pmid].push(metadata);
        }
      });
    });

    // Merge values for each project_metadata_id
    data = Object.entries(combinedMap).map(([projectMetadataId, metadatas]) => {
      // Helper to merge a field
      function mergeField<T>(getter: (m: SourceDocumentMetadataRead) => T): T | null {
        const values = metadatas.map(getter);
        const first = values[0];
        return values.every((v) => v === first) ? first : null;
      }

      return {
        int_value: mergeField((m) => m.int_value),
        str_value: mergeField((m) => m.str_value),
        boolean_value: mergeField((m) => m.boolean_value),
        date_value: mergeField((m) => m.date_value),
        list_value:
          mergeField((m) => JSON.stringify(m.list_value)) === JSON.stringify(metadatas[0].list_value)
            ? metadatas[0].list_value
            : null,
        ids: metadatas.map((m) => m.id),
        project_metadata_id: Number(projectMetadataId),
      };
    });
  }

  return {
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
    isSuccess,
    data,
  };
};

const useGetSdocMetadataBulk = (sdocIds: number[]) =>
  useQueries({
    queries: sdocIds.map((sdocId) => sdocMetadataQueries.bySdoc(sdocId)),
    combine: combineBulkData,
  });

// SDOC METADATA MUTATIONS

const useUpdateBulkSdocMetadata = () =>
  useMutation({
    mutationKey: [...sdocMetadataQueries.all(), "updateBulkSdocMetadata"],
    mutationFn: SdocMetadataService.updateBulk,
    meta: {
      datsEvent: "SDOC_METADATA_UPDATED_BATCH",
      successMessage: (data: SourceDocumentMetadataRead[]) => `Updated ${data.length} document metadata values`,
    },
  });

const useSdocMetadataQuery = <T = SdocMetadataMap>({
  sdocId,
  select,
}: {
  sdocId: number | null | undefined;
  select?: (data: SdocMetadataMap) => T;
}) =>
  useQuery({
    ...sdocMetadataQueries.bySdoc(sdocId),
    select,
  });

const useGetSdocMetadataByKey = (sdocId: number | null | undefined, key: string) =>
  useQuery(sdocMetadataQueries.bySdocAndKey(sdocId, key));

// number of sdocs that have a valid date for a date metadata
const useCountSdocsWithDateMetadata = (projectId: number, dateMetadataId: number) =>
  useQuery(sdocMetadataQueries.sdocCountWithDate(projectId, dateMetadataId));

export const SdocMetadataHooks = {
  useGetSdocMetadata,
  useGetSdocMetadataByProjectMetadataId,
  useGetSdocMetadataBulk,
  useUpdateBulkSdocMetadata,
  useSdocMetadataQuery,
  useGetSdocMetadataByKey,
  useCountSdocsWithDateMetadata,
};
