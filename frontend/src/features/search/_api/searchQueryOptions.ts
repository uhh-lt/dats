import { projectMetadataQueryOptions } from "@api/hooks/MetadataHooks";
import { queryOptions } from "@tanstack/react-query";

export const projectMetadataListQueryOptions = (projectId: number) =>
  queryOptions({
    ...projectMetadataQueryOptions(projectId),
    select: (projectMetadata) => Object.values(projectMetadata),
  });
