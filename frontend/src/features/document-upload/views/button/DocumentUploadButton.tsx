import UploadFileIcon from "@mui/icons-material/UploadFile";
import { IconButton, Tooltip } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";

export function DocumentUploadButton() {
  const openDocumentUploadDialog = useOpenDialog("documentUpload");

  return (
    <Tooltip title="Upload Documents">
      <IconButton onClick={openDocumentUploadDialog}>
        <UploadFileIcon />
      </IconButton>
    </Tooltip>
  );
}
