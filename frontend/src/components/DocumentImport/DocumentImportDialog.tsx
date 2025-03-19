import { Dialog, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { CRUDDialogActions } from "../dialogSlice";
import DocumentImportJobsView from "./DocumentImportJobsView";
import { FileUploadSection } from "./FileUploadSection";
import { UrlCrawlerSection } from "./UrlCrawlerSection";

export default function DocumentImportDialog() {
  // Dialog open state from Redux
  const open = useAppSelector((state) => state.dialog.isDocumentImportOpen);
  const dispatch = useAppDispatch();

  // Get project ID from URL
  const { projectId } = useParams<{ projectId: string }>();
  const projId = parseInt(projectId!);

  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeDocumentImport());
  }, [dispatch]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import Documents</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ minHeight: "300px" }}>
            <FileUploadSection projectId={projId} />
            <UrlCrawlerSection projectId={projId} />
          </Stack>
          <DocumentImportJobsView projectId={projId} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
