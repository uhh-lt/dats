import { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { useAppSelector } from "@store/storeHooks";
import { useQueries, useQuery, UseQueryResult } from "@tanstack/react-query";
import { metadataQueries, ProjectMetadataMap, SdocMetadataMap } from "./metadataQueries";

// PROJECT METADATA QUERIES
// The queries themselves live in metadataQueries. The hooks below only derive data from them.

export const useProjectMetadataQuery = <T>({
  select,
  enabled,
}: {
  select: (data: ProjectMetadataMap) => T;
  enabled?: boolean;
}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...metadataQueries.byProject(projectId!),
    select,
    enabled: projectId !== undefined && (enabled ?? true),
  });
};

export const useGetProjectMetadata = (metadataId: number | null | undefined) =>
  useProjectMetadataQuery({
    select: (data) => data[metadataId!],
    enabled: !!metadataId,
  });

export const useGetProjectMetadataList = () => useProjectMetadataQuery({ select: (data) => Object.values(data) });

// SDOC METADATA QUERIES

export const useGetSdocMetadata = (sdocId: number | null | undefined) =>
  useQuery({
    ...metadataQueries.bySdoc(sdocId),
    select: (data) => Object.values(data),
  });

export const useGetSdocMetadataByProjectMetadataId = (sdocId: number | null | undefined, projectMetadataId: number) =>
  useQuery({
    ...metadataQueries.bySdoc(sdocId),
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

export const useGetSdocMetadataBulk = (sdocIds: number[]) =>
  useQueries({
    queries: sdocIds.map((sdocId) => metadataQueries.bySdoc(sdocId)),
    combine: combineBulkData,
  });
