import { useMutation } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { SdocMetadataService } from "./openapi/services/SdocMetadataService.ts";

const useUpdateMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
    },
  });

const useUpdateBulkMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateBulk,
    onSuccess: (metadatas) => {
      metadatas.forEach((metadata) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS, metadata.source_document_id] });
      });
    },
  });

const SdocMetadataHooks = {
  useUpdateMetadata,
  useUpdateBulkMetadata,
};

export default SdocMetadataHooks;
