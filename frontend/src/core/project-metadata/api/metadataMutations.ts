import { ProjectMetadataService } from "@api/services/ProjectMetadataService";
import { SdocMetadataService } from "@api/services/SdocMetadataService";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { useMutation } from "@tanstack/react-query";
import { metadataQueries } from "./metadataQueries";

// PROJECT METADATA MUTATIONS
export const useCreateProjectMetadata = () =>
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

export const useUpdateProjectMetadata = () =>
  useMutation({
    mutationKey: [...metadataQueries.all(), "updateProjectMetadata"],
    mutationFn: ProjectMetadataService.updateById,
    meta: {
      datsEvent: "PROJECT_METADATA_UPDATED",
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

export const useDeleteProjectMetadata = () =>
  useMutation({
    mutationKey: [...metadataQueries.all(), "deleteProjectMetadata"],
    mutationFn: ProjectMetadataService.deleteById,
    meta: {
      datsEvent: "PROJECT_METADATA_DELETED",
      successMessage: (data: ProjectMetadataRead) => `Deleted metadata "${data.key}"`,
    },
  });

// SDOC METADATA MUTATIONS

export const useUpdateBulkSdocMetadata = () =>
  useMutation({
    mutationKey: [...metadataQueries.all(), "updateBulkSdocMetadata"],
    mutationFn: SdocMetadataService.updateBulk,
    meta: {
      datsEvent: "SDOC_METADATA_UPDATED_BATCH",
      successMessage: (data: SourceDocumentMetadataRead[]) => `Updated ${data.length} document metadata values`,
    },
  });
