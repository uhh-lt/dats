import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { DocumentTagRead } from "../../../api/openapi";
import { useCallback } from "react";
import SdocHooks from "../../../api/SdocHooks";
import { QueryKey } from "../../../api/QueryKey";

export function useDeletableDocumentTags(sdocId: number | undefined) {
  // query
  const documentTags = SdocHooks.useGetAllDocumentTags(sdocId);

  // mutations
  const queryClient = useQueryClient();
  const removeTagMutation = SdocHooks.useRemoveDocumentTag({
    onSuccess: (doc) => {
      queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
      queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH]);
      SnackbarAPI.openSnackbar({
        text: `Removed tag from document ${doc.filename}!`,
        severity: "success",
      });
    },
  });

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
