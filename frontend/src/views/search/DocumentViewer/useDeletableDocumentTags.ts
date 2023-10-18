import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { DocumentTagRead } from "../../../api/openapi";
import { useCallback } from "react";
import SdocHooks from "../../../api/SdocHooks";

export function useDeletableDocumentTags(sdocId: number | undefined) {
  // query
  const documentTags = SdocHooks.useGetAllDocumentTags(sdocId);

  // mutations
  const removeTagMutation = SdocHooks.useRemoveDocumentTag();

  const handleDeleteDocumentTag = useCallback(
    (tag: DocumentTagRead) => {
      if (sdocId) {
        const mutation = removeTagMutation.mutate;
        mutation(
          {
            sdocId: sdocId,
            tagId: tag.id,
          },
          {
            onSuccess: (sdoc) => {
              SnackbarAPI.openSnackbar({
                text: `Removed tag from document ${sdoc.filename}!`,
                severity: "success",
              });
            },
          }
        );
      } else {
        throw new Error("Trying to delete DocumentTag from undefined SourceDocument");
      }
    },
    [removeTagMutation.mutate, sdocId]
  );

  return { documentTags, handleDeleteDocumentTag };
}
