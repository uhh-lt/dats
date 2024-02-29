import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { SourceDocumentMetadataReadResolved } from "./openapi/models/SourceDocumentMetadataReadResolved.ts";
import { SdocMetadataService } from "./openapi/services/SdocMetadataService.ts";

const useCreateMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.createNewMetadata,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, data.source_document_id] });
    },
  });

const useGetMetadata = (metadataId: number | null | undefined) =>
  useQuery<SourceDocumentMetadataReadResolved, Error>({
    queryKey: [QueryKey.SDOC_METADATA, metadataId],
    queryFn: () => SdocMetadataService.getById({ metadataId: metadataId! }),
    enabled: !!metadataId,
  });

const useUpdateMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA, metadata.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
    },
  });

const useDeleteMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATA, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, data.source_document_id] });
    },
  });

const SdocMetadataHooks = {
  useCreateMetadata,
  useGetMetadata,
  useUpdateMetadata,
  useDeleteMetadata,
};

export default SdocMetadataHooks;
