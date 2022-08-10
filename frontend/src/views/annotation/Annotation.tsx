import { Grid, Portal, Typography } from "@mui/material";
import React, { useContext, useEffect } from "react";
import DocumentExplorer from "../../features/document-explorer/DocumentExplorer";
import { useParams } from "react-router-dom";
import CodeExplorer from "./CodeExplorer/CodeExplorer";
import SdocHooks from "../../api/SdocHooks";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useSelectOrCreateCurrentUsersAnnotationDocument } from "./useSelectOrCreateCurrentUsersAnnotationDocument";
import { AnnotationDocumentSelector } from "./AnnotationDocumentSelector";
import { DocType } from "../../api/openapi";
import { Annotator } from "./Annotator/Annotator";
import ImageViewer from "../search/DocumentViewer/ImageViewer";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { AnnoActions } from "./annoSlice";

function Annotation() {
  // global client state (URL)
  const { sdocId } = useParams();
  const sourceDocumentId = sdocId ? parseInt(sdocId) : undefined;

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const dispatch = useAppDispatch();

  // global server state (react query)
  const sourceDocument = SdocHooks.useGetDocument(sourceDocumentId);
  const annotationDocument = useSelectOrCreateCurrentUsersAnnotationDocument(sourceDocumentId);

  // effects
  // set visible adocs to current users adoc (so that your own annotations are visible by default)
  useEffect(() => {
    if (annotationDocument) {
      dispatch(AnnoActions.setVisibleAdocIds([annotationDocument.id]));
    }
  }, [dispatch, annotationDocument]);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          {sourceDocument.isSuccess ? `Annotator: ${sourceDocument.data.filename}` : "Annotator"}
        </Typography>
      </Portal>
      <Grid container columnSpacing={2} className="h100">
        <Grid item md={3} className="h100">
          <DocumentExplorer sx={{ overflow: "auto" }} />
        </Grid>
        <Grid item md={6} className="h100 myFlexContainer">
          <AnnotationDocumentSelector sdocId={sourceDocumentId} />
          {sdocId ? (
            <>
              {sourceDocument.isLoading && <div>Loading SourceDocument!</div>}
              {sourceDocument.isError && <div>Error: {sourceDocument.error.message}</div>}
              {!annotationDocument && <div>Loading or creating your AnnotationDocument!</div>}
              {sourceDocument.isSuccess && annotationDocument && (
                <>
                  {sourceDocument.data.doctype === DocType.IMAGE ? (
                    <ImageViewer sdoc={sourceDocument.data} adoc={annotationDocument} showEntities={true} />
                  ) : sourceDocument.data.doctype === DocType.TEXT ? (
                    <Annotator sdoc={sourceDocument.data} adoc={annotationDocument} visibleAdocIds={visibleAdocIds} />
                  ) : (
                    <div>ERROR! This DocType is not (yet) supported!</div>
                  )}
                </>
              )}
            </>
          ) : (
            <div>Please select a document from the Document Explorer :)</div>
          )}
        </Grid>
        <Grid item md={3} className="h100">
          <CodeExplorer />
        </Grid>
      </Grid>
    </>
  );
}

export default Annotation;
