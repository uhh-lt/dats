import { metadataQueries } from "@api/queries/metadataQueries";
import { queryOptions } from "@tanstack/react-query";

export const projectMetadataListQueryOptions = (projectId: number) =>
  queryOptions({
    ...metadataQueries.byProjectRequired(projectId),
    select: (projectMetadata) => Object.values(projectMetadata),
  });
