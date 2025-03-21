import { Box, Dialog, Stack } from "@mui/material";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DocumentUploadJobsView from "./DocumentUploadJobsView.tsx";
import { FileUploadSection } from "./FileUploadSection.tsx";
import { UrlCrawlerSection } from "./UrlCrawlerSection.tsx";

export default function DocumentUploadDialog() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // open/close dialog
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.dialog.isDocumentUploadOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeDocumentUpload());
  }, [dispatch]);

  // maximize feature
  const [isMaximized, setIsMaximized] = useState(false);
  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Upload Documents"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <Stack spacing={2} p={2} overflow="auto" sx={{ backgroundColor: "grey.100" }}>
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
