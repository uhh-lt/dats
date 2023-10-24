import { useAuth } from "../../auth/AuthProvider";
import SdocHooks from "../../api/SdocHooks";
import { useEffect, useRef, useState } from "react";
import { AnnotationDocumentRead } from "../../api/openapi";
import AdocHooks from "../../api/AdocHooks";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";

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
  const createAdocMutation = AdocHooks.useCreateAdoc();

  // Make sure the mutation is only fired once.
  // `createAdocMutation`.isLoading will be outdated when the effect
  // below is called twice, because mutation state is only updated after a
  // re-render.
  const isMutating = useRef(false);

  // create annotation document for user if no adoc exists
  useEffect(() => {
    if (annotationDocuments.data && user.data) {
      const adoc = annotationDocuments.data.find((ad) => ad.user_id === user.data.id);

      if (adoc) {
        if (adoc !== annotationDocument) {
          setAnnotationDocument(adoc);
          createAdocMutation.reset();
        }
        return;
      }

      // we just created an annotation document, no need to create another one
      if (createAdocMutation.isSuccess) return;

      // we are creating an annotation document, no need to create another one
      if (createAdocMutation.isLoading || isMutating.current) return;

      // we are not creating an annotation document, but we need to create one
      createAdocMutation.mutate(
        {
          requestBody: {
            user_id: user.data.id,
            source_document_id: sdocId!, // we ḱnow that sdocId is defined, because annotationDocuments.data exists
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Added annotation document for ${data.user_id} (${user.data!.first_name})`,
              severity: "success",
            });
            isMutating.current = false;
          },
        }
      );
      isMutating.current = true;
    }
  }, [annotationDocument, user.data, annotationDocuments.data, createAdocMutation, sdocId, isMutating]);

  // only return an annotation document if it matches with the source document
  return annotationDocument?.source_document_id === sdocId ? annotationDocument : undefined;
}
