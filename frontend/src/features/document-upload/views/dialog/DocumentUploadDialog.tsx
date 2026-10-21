import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { Box, Dialog, Stack } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { DocumentUploadJobsView } from "./_components/DocumentUploadJobsView";
import { FileUploadSection } from "./_components/FileUploadSection";
import { UrlCrawlerSection } from "./_components/UrlCrawlerSection";

interface DocumentUploadDialogProps {
  projectId: number;
}

export function DocumentUploadDialog({ projectId }: DocumentUploadDialogProps) {
  // dialog state
  const { isOpen, close: handleClose } = useDialogBus("documentUpload");

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
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
