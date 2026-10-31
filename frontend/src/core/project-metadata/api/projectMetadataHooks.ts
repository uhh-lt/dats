import { ProjectMetadataService } from "@api/services/ProjectMetadataService";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ProjectMetadataMap, projectMetadataQueries } from "./projectMetadataQueries";

// PROJECT METADATA QUERIES
// The queries themselves live in projectMetadataQueries. The hooks below only derive data from them.

const useGetAllProjectMetadataMap = <T>({
  select,
  enabled,
}: {
  select: (data: ProjectMetadataMap) => T;
  enabled?: boolean;
}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...projectMetadataQueries.byProject(projectId!),
    select,
    enabled: projectId !== undefined && (enabled ?? true),
  });
};

const useGetProjectMetadata = (metadataId: number | null | undefined) =>
  useGetAllProjectMetadataMap({
    select: (data) => data[metadataId!],
    enabled: !!metadataId,
  });

const useGetAllProjectMetadata = () => useGetAllProjectMetadataMap({ select: (data) => Object.values(data) });

// PROJECT METADATA MUTATIONS
const useCreateProjectMetadata = () =>
  useMutation({
    mutationKey: [...projectMetadataQueries.all(), "createProjectMetadata"],
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
    mutationKey: [...projectMetadataQueries.all(), "updateProjectMetadata"],
    mutationFn: ProjectMetadataService.updateById,
    meta: {
      datsEvent: "PROJECT_METADATA_UPDATED",
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

const useUpdateBulkProjectMetadata = () =>
  useMutation({
    mutationKey: [...projectMetadataQueries.all(), "updateBulkProjectMetadata"],
    mutationFn: ProjectMetadataService.updateProjectMetadataBulk,
    meta: {
      datsEvent: "PROJECT_METADATA_UPDATED_BATCH",
      successMessage: (metadata: ProjectMetadataRead[]) => `Updated ${metadata.length} metadata field(s)`,
      errorMessage: (error: { status: number }) =>
        error.status === 409 ? "A metadata key is already taken" : "Could not update the metadata fields",
    },
  });

const useDeleteProjectMetadata = () =>
  useMutation({
    mutationKey: [...projectMetadataQueries.all(), "deleteProjectMetadata"],
    mutationFn: ProjectMetadataService.deleteById,
    meta: {
      datsEvent: "PROJECT_METADATA_DELETED",
      successMessage: (data: ProjectMetadataRead) => `Deleted metadata "${data.key}"`,
    },
  });

export const ProjectMetadataHooks = {
  useGetProjectMetadata,
  useGetAllProjectMetadata,
  useCreateProjectMetadata,
  useUpdateProjectMetadata,
  useUpdateBulkProjectMetadata,
  useDeleteProjectMetadata,
};
