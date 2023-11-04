import { useMutation, useQuery } from "@tanstack/react-query";
import { SdocMetadataService, SourceDocumentMetadataRead } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

const useCreateMetadata = () =>
  useMutation(SdocMetadataService.createNewMetadata, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.SDOC_METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
    },
  });

const useGetMetadata = (metadataId: number | undefined) =>
  useQuery<SourceDocumentMetadataRead, Error>(
    [QueryKey.SDOC_METADATA, metadataId],
    () => SdocMetadataService.getById({ metadataId: metadataId! }),
    {
      enabled: !!metadataId,
    },
  );

const useUpdateMetadata = () =>
  useMutation(SdocMetadataService.updateById, {
    onSuccess: (metadata) => {
      queryClient.invalidateQueries([QueryKey.SDOC_METADATA, metadata.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, metadata.source_document_id]);
    },
  });

const useDeleteMetadata = () =>
  useMutation(SdocMetadataService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.SDOC_METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
    },
  });

const SdocMetadataHooks = {
  useCreateMetadata,
  useGetMetadata,
  useUpdateMetadata,
  useDeleteMetadata,
};

export default SdocMetadataHooks;
