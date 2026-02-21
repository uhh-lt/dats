import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Box, Typography } from "@mui/material";
import { useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../store/dialogSlice.ts";

export function NoDocumentsPlaceholder() {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(CRUDDialogActions.openDocumentUpload());
  }, [dispatch]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 2,
        p: 4,
      }}
    >
      <UploadFileIcon
        sx={{
          fontSize: "64px",
          color: "text.secondary",
          cursor: "pointer",
          transition: "transform 0.2s, color 0.2s",
          "&:hover": {
            transform: "scale(1.1)",
            color: "primary.main",
          },
          "&:active": {
            transform: "scale(0.95)",
          },
        }}
        onClick={handleClick}
      />
      <Typography variant="h6" color="text.secondary">
        No Documents Found
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center">
        There are no documents in this project yet. Start by uploading some documents using the button above.
      </Typography>
    </Box>
  );
}
