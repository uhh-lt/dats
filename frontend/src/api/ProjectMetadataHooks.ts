import { useMutation } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { ProjectMetadataRead } from "./openapi/models/ProjectMetadataRead.ts";
import { ProjectMetadataService } from "./openapi/services/ProjectMetadataService.ts";

const useCreateMetadata = () =>
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

const useUpdateMetadata = () =>
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

const useDeleteMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] });
    },
  });

const ProjectMetadataHooks = {
  useCreateMetadata,
  useUpdateMetadata,
  useDeleteMetadata,
};

export default ProjectMetadataHooks;
