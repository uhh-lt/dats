import { Chip, IconButton, Typography } from "@mui/material";
import { SourceDocumentWithDataRead } from "../../../../api/openapi";
import DeleteIcon from "@mui/icons-material/Delete";
import SdocHooks from "../../../../api/SdocHooks";
import NoteIcon from "@mui/icons-material/Note";

interface LinkedDocumentRowProps {
  sdocId: number;
  handleClick?: () => void;
  handleDelete?: (sdoc: SourceDocumentWithDataRead) => void;
}

function LinkedDocumentRow({ sdocId, handleClick, handleDelete }: LinkedDocumentRowProps) {
  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);

  return (
    <>
      {sdoc.isLoading && <Chip variant="outlined" label="Loading..." />}
      {sdoc.isError && <Chip variant="outlined" label={sdoc.error.message} />}
      {sdoc.isSuccess && (
        <span
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            onClick={handleClick ? handleClick : undefined}
            disableRipple
            color="inherit"
            sx={{
              "&:hover": { color: "#42a5f5" },
            }}
          >
            <NoteIcon sx={{ color: "#0288d1" }} />
            <Typography variant="body1">{sdoc.data.filename}</Typography>
          </IconButton>
          <IconButton onClick={undefined}>
            <DeleteIcon />
          </IconButton>
        </span>
      )}
    </>
  );
}

export default LinkedDocumentRow;
