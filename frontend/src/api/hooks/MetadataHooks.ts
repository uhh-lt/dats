import { metadataQueries, ProjectMetadataMap, SdocMetadataMap } from "@api/queries/metadataQueries";
import { ProjectMetadataService } from "@api/services/ProjectMetadataService";
import { SdocMetadataService } from "@api/services/SdocMetadataService";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQueries, useQuery, UseQueryResult } from "@tanstack/react-query";

// PROJECT METADATA QUERIES
// The queries themselves live in metadataQueries. The hooks below only derive data from them.

const useProjectMetadataQuery = <T>({
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

const useGetProjectMetadata = (metadataId: number | null | undefined) =>
  useProjectMetadataQuery({
    select: (data) => data[metadataId!],
    enabled: !!metadataId,
  });

const useGetProjectMetadataList = () => useProjectMetadataQuery({ select: (data) => Object.values(data) });

// PROJECT METADATA MUTATIONS
const useCreateProjectMetadata = () =>
  useMutation({
    mutationKey: [...metadataQueries.all(), "createProjectMetadata"],
    mutationFn: ProjectMetadataService.createMetadata,
    meta: {
      datsEvent: "PROJECT_METADATA_CREATED",
      successMessage: (data: ProjectMetadataRead) => `Added metadata to Project ${data.project_id}`,
      errorMessage: (error: { status: number }) =>
        error.status === 409 ? "Key already exists" : "Could not add metadata",
    },
  });

const useUpdateProjectMetadata = () =>
  useMutation({
    mutationKey: [...metadataQueries.all(), "updateProjectMetadata"],
    mutationFn: ProjectMetadataService.updateById,
    meta: {
      datsEvent: "PROJECT_METADATA_UPDATED",
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

const useDeleteProjectMetadata = () =>
  useMutation({
    mutationKey: [...metadataQueries.all(), "deleteProjectMetadata"],
    mutationFn: ProjectMetadataService.deleteById,
    meta: {
      datsEvent: "PROJECT_METADATA_DELETED",
      successMessage: (data: ProjectMetadataRead) => `Deleted metadata "${data.key}"`,
    },
  });

// SDOC METADATA QUERIES

const useGetSdocMetadata = (sdocId: number | null | undefined) =>
  useQuery({
    ...metadataQueries.bySdoc(sdocId),
    select: (data) => Object.values(data),
  });

const useGetSdocMetadataByProjectMetadataId = (sdocId: number | null | undefined, projectMetadataId: number) =>
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

const useGetSdocMetadataBulk = (sdocIds: number[]) =>
  useQueries({
    queries: sdocIds.map((sdocId) => metadataQueries.bySdoc(sdocId)),
    combine: combineBulkData,
  });

// SDOC METADATA MUTATIONS

const useUpdateBulkSdocMetadata = () =>
  useMutation({
    mutationKey: [...metadataQueries.all(), "updateBulkSdocMetadata"],
    mutationFn: SdocMetadataService.updateBulk,
    meta: {
      datsEvent: "SDOC_METADATA_UPDATED_BATCH",
      successMessage: (data: SourceDocumentMetadataRead[]) => `Updated ${data.length} document metadata values`,
    },
  });

export const MetadataHooks = {
  // sdoc metadata
  useGetSdocMetadata,
  useGetSdocMetadataByProjectMetadataId,
  useGetSdocMetadataBulk,
  useUpdateBulkSdocMetadata,
  // project metadata
  useGetProjectMetadataList,
  useGetProjectMetadata,
  useCreateProjectMetadata,
  useUpdateProjectMetadata,
  useDeleteProjectMetadata,
};
