import { useMutation, useQuery } from "@tanstack/react-query";
import { ProjectMetadataRead, ProjectMetadataService } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

const useCreateMetadata = () =>
  useMutation(ProjectMetadataService.createNewMetadata, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_METADATAS, data.project_id]);
    },
    meta: {
      successMessage: (data: ProjectMetadataRead) => `Added metadata to Project ${data.project_id}`,
      errorMessage: (error: any) => (error.status === 409 ? "Key already exists" : "Could not add metadata"),
    },
  });

const useGetMetadata = (metadataId: number | null | undefined) =>
  useQuery<ProjectMetadataRead, Error>(
    [QueryKey.PROJECT_METADATA, metadataId],
    () => ProjectMetadataService.getById({ metadataId: metadataId! }),
    {
      enabled: !!metadataId,
    },
  );

const useUpdateMetadata = () =>
  useMutation(ProjectMetadataService.updateById, {
    onSuccess: (metadata) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_METADATA, metadata.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_METADATAS, metadata.project_id]);
    },
    meta: {
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

const useDeleteMetadata = () =>
  useMutation(ProjectMetadataService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_METADATAS, data.project_id]);
    },
  });

const ProjectMetadataHooks = {
  useCreateMetadata,
  useGetMetadata,
  useUpdateMetadata,
  useDeleteMetadata,
};

export default ProjectMetadataHooks;
