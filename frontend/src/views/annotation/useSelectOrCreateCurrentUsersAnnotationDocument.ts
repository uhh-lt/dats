import { useAuth } from "../../auth/AuthProvider";
import SdocHooks from "../../api/SdocHooks";
import { useEffect, useState } from "react";
import { AnnotationDocumentRead } from "../../api/openapi";
import { useQueryClient } from "@tanstack/react-query";
import AdocHooks from "../../api/AdocHooks";
import SnackbarAPI from "../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../api/QueryKey";

/**
 * Given a SourceDocument (via sdocId), return the current user's AnnotationDocument for that SourceDocument.
 * If the user has no AnnotationDocument for the SourceDocument, create one.
 * @param sdocId The SourceDocument (via sdocId) to get the AnnotationDocument for.
 */
export function useSelectOrCreateCurrentUsersAnnotationDocument(sdocId: number | undefined) {
  // global client state (context)
  const { user } = useAuth();

  // global server state (react query)
  // todo: we need a route to get annotation document by sdocId and userId! (or a way to create annotation documents automatically in the backend)
  const annotationDocuments = SdocHooks.useGetAllAnnotationDocuments(sdocId);

  // local state
  const [annotationDocument, setAnnotationDocument] = useState<AnnotationDocumentRead | undefined>();

  // mutation
  const queryClient = useQueryClient();
  const createAdocMutation = AdocHooks.useCreateAdoc({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.SDOC_ADOCS, data.source_document_id]);
      SnackbarAPI.openSnackbar({
        text: `Added annotation document for ${user.data!.first_name}`,
        severity: "success",
      });
    },
  });

  // reset mutation state when sdocId changes
  useEffect(() => {
    createAdocMutation.reset();
  }, [sdocId]);

  // create annotation document for user if no adoc exists
  useEffect(() => {
    if (annotationDocuments.isSuccess && user.isSuccess) {
      const adoc = annotationDocuments.data.find((ad) => ad.user_id === user.data.id);
      if (adoc) {
        setAnnotationDocument(adoc);
        return;
      }

      // we just created an annotation document, no need to create another one
      if (createAdocMutation.isSuccess) return;

      // we are creating an annotation document, no need to create another one
      if (createAdocMutation.isLoading) return;

      // we are not creating an annotation document, but we need to create one
      createAdocMutation.mutate({
        requestBody: {
          user_id: user.data.id,
          source_document_id: sdocId!, // we ḱnow that sdocId is defined, because annotationDocuments.data exists
        },
      });
    }
  }, [user, annotationDocuments, createAdocMutation, sdocId]);

  console.log("HIHIHI", user.isSuccess);

  // only return an annotation document if it matches with the source document
  return annotationDocument?.source_document_id === sdocId ? annotationDocument : undefined;
}
