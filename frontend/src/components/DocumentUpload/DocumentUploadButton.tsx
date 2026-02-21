import UploadFileIcon from "@mui/icons-material/UploadFile";
import { IconButton, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { CRUDDialogActions } from "../../store/dialogSlice";

export function DocumentUploadButton() {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(CRUDDialogActions.openDocumentUpload());
  }, [dispatch]);

  return (
    <Tooltip title="Upload Documents">
      <IconButton onClick={handleClick}>
        <UploadFileIcon />
      </IconButton>
    </Tooltip>
  );
}
