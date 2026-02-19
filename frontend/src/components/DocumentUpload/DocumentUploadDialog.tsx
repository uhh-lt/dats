import { Box, Dialog, Stack } from "@mui/material";
import { useCallback } from "react";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DocumentUploadJobsView from "./DocumentUploadJobsView.tsx";
import { FileUploadSection } from "./FileUploadSection.tsx";
import { UrlCrawlerSection } from "./UrlCrawlerSection.tsx";

function DocumentUploadDialog({ projectId }: { projectId: number }) {
  // open/close dialog
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.dialog.isDocumentUploadOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeDocumentUpload());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Upload Documents"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <Stack spacing={2} p={2} overflow="auto" height="100%" sx={{ backgroundColor: "grey.100" }}>
        <Stack direction="row" spacing={2}>
          <FileUploadSection projectId={projectId} />
          <UrlCrawlerSection projectId={projectId} />
        </Stack>
        <Box className="myFlexContainer myFlexFillAllContainer">
          <DocumentUploadJobsView projectId={projectId} />
        </Box>
      </Stack>
    </Dialog>
  );
}

export default DocumentUploadDialog;
