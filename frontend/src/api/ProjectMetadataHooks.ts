import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { ProjectMetadataRead } from "./openapi/models/ProjectMetadataRead.ts";
import { ProjectMetadataService } from "./openapi/services/ProjectMetadataService.ts";

const useCreateMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.createNewMetadata,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATA, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, data.project_id] });
    },
    meta: {
      successMessage: (data: ProjectMetadataRead) => `Added metadata to Project ${data.project_id}`,
      errorMessage: (error: { status: number }) =>
        error.status === 409 ? "Key already exists" : "Could not add metadata",
    },
  });

const useGetMetadata = (metadataId: number | null | undefined) =>
  useQuery<ProjectMetadataRead, Error>({
    queryKey: [QueryKey.PROJECT_METADATA, metadataId],
    queryFn: () => ProjectMetadataService.getById({ metadataId: metadataId! }),
    enabled: !!metadataId,
  });

const useUpdateMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATA, metadata.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, metadata.project_id] });
    },
    meta: {
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

const useDeleteMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATA, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, data.project_id] });
    },
  });

const ProjectMetadataHooks = {
  useCreateMetadata,
  useGetMetadata,
  useUpdateMetadata,
  useDeleteMetadata,
};

export default ProjectMetadataHooks;
