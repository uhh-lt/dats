import UploadFileIcon from "@mui/icons-material/UploadFile";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { useCallback } from "react";
import { UIDialogActions } from "../../../../store/global/dialogSlice";

export function DocumentUploadButton() {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(UIDialogActions.openDocumentUpload());
  }, [dispatch]);

  return (
    <Tooltip title="Upload Documents">
      <IconButton onClick={handleClick}>
        <UploadFileIcon />
      </IconButton>
    </Tooltip>
  );
}
