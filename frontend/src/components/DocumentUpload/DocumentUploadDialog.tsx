import { Dialog, DialogContent, Stack } from "@mui/material";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import DialogHeader from "../MUI/DialogHeader.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DocumentUploadJobsView from "./DocumentUploadJobsView.tsx";
import { FileUploadSection } from "./FileUploadSection.tsx";
import { UrlCrawlerSection } from "./UrlCrawlerSection.tsx";

export default function DocumentUploadDialog() {
  const [isMaximized, setIsMaximized] = useState(false);

  // Dialog open state from Redux
  const open = useAppSelector((state) => state.dialog.isDocumentUploadOpen);
  const dispatch = useAppDispatch();

  // Get project ID from URL
  const { projectId } = useParams<{ projectId: string }>();
  const projId = parseInt(projectId!);

  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeDocumentUpload());
  }, [dispatch]);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DialogHeader
        title="Upload Documents"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ minHeight: "300px" }}>
            <FileUploadSection projectId={projId} />
            <UrlCrawlerSection projectId={projId} />
          </Stack>
          <DocumentUploadJobsView projectId={projId} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
