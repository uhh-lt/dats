import { Grid, Portal, Typography } from "@mui/material";
import React, { useContext } from "react";
import DocumentExplorer from "../../features/document-explorer/DocumentExplorer";
import { useParams } from "react-router-dom";
import CodeExplorer from "./CodeExplorer/CodeExplorer";
import SdocHooks from "../../api/SdocHooks";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useSelectOrCreateCurrentUsersAnnotationDocument } from "./useSelectOrCreateCurrentUsersAnnotationDocument";
import { AnnotationDocumentSelector } from "./AnnotationDocumentSelector";
import { DocType } from "../../api/openapi";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator";
import TextAnnotator from "./TextAnnotator/TextAnnotator";

function Annotation() {
  // global client state (URL)
  const { sdocId } = useParams();
  const sourceDocumentId = sdocId ? parseInt(sdocId) : undefined;

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global server state (react query)
  const sourceDocument = SdocHooks.useGetDocument(sourceDocumentId);
  const annotationDocument = useSelectOrCreateCurrentUsersAnnotationDocument(sourceDocumentId);

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
              {sourceDocument.isSuccess && annotationDocument ? (
                <>
                  {sourceDocument.data.doctype === DocType.IMAGE ? (
                    <ImageAnnotator sdoc={sourceDocument.data} adoc={annotationDocument} />
                  ) : sourceDocument.data.doctype === DocType.TEXT ? (
                    <TextAnnotator sdoc={sourceDocument.data} adoc={annotationDocument} />
                  ) : (
                    <div>ERROR! This DocType is not (yet) supported!</div>
                  )}
                </>
              ) : sourceDocument.isError ? (
                <div>Error: {sourceDocument.error.message}</div>
              ) : (
                <div>Loading...</div>
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
