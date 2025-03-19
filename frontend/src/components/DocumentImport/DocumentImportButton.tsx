import UploadFileIcon from "@mui/icons-material/UploadFile";
import { IconButton, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { CRUDDialogActions } from "../dialogSlice";

export default function DocumentImportButton() {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(CRUDDialogActions.openDocumentImport());
  }, [dispatch]);

  return (
    <Tooltip title="Import Documents">
      <IconButton onClick={handleClick}>
        <UploadFileIcon />
      </IconButton>
    </Tooltip>
  );
}
