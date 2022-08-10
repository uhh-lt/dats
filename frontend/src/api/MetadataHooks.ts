import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import {
  MetadataService,
  SourceDocumentMetadataCreate,
  SourceDocumentMetadataRead,
  SourceDocumentMetadataUpdate,
} from "./openapi";
import { QueryKey } from "./QueryKey";

const useCreateMetadata = (
  options: UseMutationOptions<SourceDocumentMetadataRead, Error, { requestBody: SourceDocumentMetadataCreate }>
) => useMutation(MetadataService.createNewMetadataMetadataPut, options);

const useGetMetadata = (metadataId: number | undefined) =>
  useQuery<SourceDocumentMetadataRead, Error>(
    [QueryKey.METADATA, metadataId],
    () => MetadataService.getByIdMetadataMetadataIdGet({ metadataId: metadataId! }),
    {
      enabled: !!metadataId,
    }
  );

const useUpdateMetadata = (
  options: UseMutationOptions<
    SourceDocumentMetadataRead,
    Error,
    { metadataId: number; requestBody: SourceDocumentMetadataUpdate }
  >
) => useMutation(MetadataService.updateByIdMetadataMetadataIdPatch, options);

const useDeleteMetadata = (options: UseMutationOptions<SourceDocumentMetadataRead, Error, { metadataId: number }>) =>
  useMutation(MetadataService.deleteByIdMetadataMetadataIdDelete, options);

const MetadataHooks = {
  useCreateMetadata,
  useGetMetadata,
  useUpdateMetadata,
  useDeleteMetadata,
};

export default MetadataHooks;
