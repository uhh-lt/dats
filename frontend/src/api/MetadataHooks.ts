import { useMutation, useQuery } from "@tanstack/react-query";
import { MetadataService, SourceDocumentMetadataRead } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

const useCreateMetadata = () =>
  useMutation(MetadataService.createNewMetadataMetadataPut, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
    },
  });

const useGetMetadata = (metadataId: number | undefined) =>
  useQuery<SourceDocumentMetadataRead, Error>(
    [QueryKey.METADATA, metadataId],
    () => MetadataService.getByIdMetadataMetadataIdGet({ metadataId: metadataId! }),
    {
      enabled: !!metadataId,
    }
  );

const useUpdateMetadata = () =>
  useMutation(MetadataService.updateByIdMetadataMetadataIdPatch, {
    onSuccess: (metadata) => {
      queryClient.invalidateQueries([QueryKey.METADATA, metadata.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, metadata.source_document_id]);
    },
  });

const useDeleteMetadata = () =>
  useMutation(MetadataService.deleteByIdMetadataMetadataIdDelete, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
    },
  });

const MetadataHooks = {
  useCreateMetadata,
  useGetMetadata,
  useUpdateMetadata,
  useDeleteMetadata,
};

export default MetadataHooks;
