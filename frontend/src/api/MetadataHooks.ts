import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { ProjectMetadataRead } from "./openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataReadResolved } from "./openapi/models/SourceDocumentMetadataReadResolved.ts";
import { ProjectMetadataService } from "./openapi/services/ProjectMetadataService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { SdocMetadataService } from "./openapi/services/SdocMetadataService.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";

// SDOC METADATA QUERIES

const useGetSdocMetadata = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentMetadataReadResolved[], Error>({
    queryKey: [QueryKey.SDOC_METADATAS, sdocId],
    queryFn: () =>
      SourceDocumentService.getAllMetadata({
        sdocId: sdocId!,
      }),
    enabled: !!sdocId,
  });

const useGetSdocMetadataByKey = (sdocId: number | null | undefined, key: string) =>
  useQuery<SourceDocumentMetadataReadResolved, Error>({
    queryKey: [QueryKey.SDOC_METADATA_BY_KEY, sdocId, key],
    queryFn: () =>
      SourceDocumentService.readMetadataByKey({
        sdocId: sdocId!,
        metadataKey: key,
      }),
    enabled: !!sdocId,
  });

// SDOC METADATA MUTATIONS

const useUpdateSdocMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
    },
  });

const useUpdateBulkSdocMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateBulk,
    onSuccess: (metadatas) => {
      metadatas.forEach((metadata) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
      });
    },
  });

// PROJECT METADATA QUERIES
const useGetProjectMetadata = (projectId: number) =>
  useQuery<ProjectMetadataRead[], Error>({
    queryKey: [QueryKey.PROJECT_METADATAS, projectId],
    queryFn: () =>
      ProjectService.getAllMetadata({
        projId: projectId,
      }),
  });

// PROJECT METADATA MUTATIONS
const useCreateProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.createNewMetadata,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] });
      queryClient.invalidateQueries({ queryKey: ["tableInfo"] }); // tableInfo queries need to be refetched, as there is new metadata now!
    },
    meta: {
      successMessage: (data: ProjectMetadataRead) => `Added metadata to Project ${data.project_id}`,
      errorMessage: (error: { status: number }) =>
        error.status === 409 ? "Key already exists" : "Could not add metadata",
    },
  });

const useUpdateProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, metadata.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] });
    },
    meta: {
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

const useDeleteProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] });
    },
  });

const MetadataHooks = {
  // sdoc metadata
  useGetSdocMetadata,
  useGetSdocMetadataByKey,
  useUpdateSdocMetadata,
  useUpdateBulkSdocMetadata,
  // project metadata
  useGetProjectMetadata,
  useCreateProjectMetadata,
  useUpdateProjectMetadata,
  useDeleteProjectMetadata,
};

export default MetadataHooks;
