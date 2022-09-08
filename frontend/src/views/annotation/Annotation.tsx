import { AppBar, Button, ButtonGroup, Grid, Paper, Portal, Toolbar, Typography } from "@mui/material";
import React, { useContext, useState } from "react";
import DocumentExplorer from "../../features/document-explorer/DocumentExplorer";
import { useParams } from "react-router-dom";
import CodeExplorer from "./CodeExplorer/CodeExplorer";
import SdocHooks from "../../api/SdocHooks";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useSelectOrCreateCurrentUsersAnnotationDocument } from "./useSelectOrCreateCurrentUsersAnnotationDocument";
import { AnnotationDocumentSelector } from "./AnnotationDocumentSelector";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator";
import TextAnnotator from "./TextAnnotator/TextAnnotator";
import { DocType } from "../../api/openapi";
import MemoExplorer from "./MemoExplorer/MemoExplorer";

function Annotation() {
  // global client state (URL)
  const { sdocId } = useParams();
  const sourceDocumentId = sdocId ? parseInt(sdocId) : undefined;

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global server state (react query)
  const sourceDocument = SdocHooks.useGetDocument(sourceDocumentId);
  const annotationDocument = useSelectOrCreateCurrentUsersAnnotationDocument(sourceDocumentId);

  // ui event handler
  const [showCodeExplorer, setShowCodeExplorer] = useState(true);
  const toggleShowCodeExplorer = () => {
    setShowCodeExplorer(!showCodeExplorer);
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          {sourceDocument.isSuccess ? `Annotator: ${sourceDocument.data.filename}` : "Annotator"}
        </Typography>
      </Portal>
      <Grid container columnSpacing={2} className="h100">
        <Grid item md={3} className="h100">
          <DocumentExplorer sx={{ overflow: "auto", height: "100%" }} />
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
          {/*<CodeExplorer showToolbar sx={{ height: "100%" }} />*/}
          {/*<MemoExplorer showToolbar sx={{ height: "100%" }} sdocId={1} />*/}

          <Paper square className="myFlexContainer h100" elevation={1}>
            <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
              <Toolbar variant="dense">
                <ButtonGroup>
                  <Button
                    onClick={() => toggleShowCodeExplorer()}
                    variant={showCodeExplorer ? "contained" : "outlined"}
                    color="success"
                  >
                    Code Explorer
                  </Button>
                  <Button
                    onClick={() => toggleShowCodeExplorer()}
                    variant={!showCodeExplorer ? "contained" : "outlined"}
                    color="success"
                  >
                    Memo Explorer
                  </Button>
                </ButtonGroup>
              </Toolbar>
            </AppBar>
            {showCodeExplorer ? <CodeExplorer /> : <MemoExplorer sdocId={sourceDocumentId} />}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}

export default Annotation;
