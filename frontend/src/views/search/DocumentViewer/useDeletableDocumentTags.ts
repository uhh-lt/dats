import { useMutation, useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { DocumentTagRead, SourceDocumentRead, SourceDocumentService } from "../../../api/openapi";
import { useCallback } from "react";
import SdocHooks from "../../../api/SdocHooks";
import { QueryKey } from "../../../api/QueryKey";

export function useDeletableDocumentTags(sdocId: number | undefined) {
  // query
  const documentTags = SdocHooks.useGetAllDocumentTags(sdocId);

  // mutations
  const queryClient = useQueryClient();
  const removeTagMutation = useMutation<SourceDocumentRead, Error, { sdocId: number; tagId: number }>(
    SourceDocumentService.unlinkTagSdocSdocIdTagTagIdDelete,
    {
      onError: (error: Error) => {
        SnackbarAPI.openSnackbar({
          text: error.message,
          severity: "error",
        });
      },
      onSuccess: (doc) => {
        queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
        queryClient.invalidateQueries([QueryKey.SEARCH_RESULTS]);
        SnackbarAPI.openSnackbar({
          text: `Removed tag from document ${doc.filename}!`,
          severity: "success",
        });
      },
    }
  );

  const handleDeleteDocumentTag = useCallback(
    (tag: DocumentTagRead) => {
      if (sdocId) {
        removeTagMutation.mutate({
          sdocId: sdocId,
          tagId: tag.id,
        });
      } else {
        throw new Error("Trying to delete DocumentTag from undefined SourceDocument");
      }
    },
    [removeTagMutation, sdocId]
  );

  return { documentTags, handleDeleteDocumentTag };
}
