import { Dialog, DialogContent, Stack } from "@mui/material";
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
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ minHeight: "300px" }}>
            <FileUploadSection projectId={projectId} />
            <UrlCrawlerSection projectId={projectId} />
          </Stack>
          <DocumentUploadJobsView projectId={projectId} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
