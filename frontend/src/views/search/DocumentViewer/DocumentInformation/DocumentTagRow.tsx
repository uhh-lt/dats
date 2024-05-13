import DeleteIcon from "@mui/icons-material/Delete";
import LabelIcon from "@mui/icons-material/Label";
import { Chip, IconButton, Stack } from "@mui/material";
import TagHooks from "../../../../api/TagHooks.ts";
import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";

interface DocumentTagListProps {
  tagId: number;
  handleClick?: (tag: DocumentTagRead) => void;
  handleDelete?: (tag: DocumentTagRead) => void;
}

function DocumentTagRow({ tagId, handleDelete }: DocumentTagListProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <>
      {tag.isLoading && <Chip variant="outlined" label="Loading..." />}
      {tag.isError && <Chip variant="outlined" label={tag.error.message} />}
      {tag.isSuccess && (
        <Stack direction={"row"}>
          <IconButton disabled>
            <LabelIcon sx={{ color: tag.data.color }} />
          </IconButton>
          <span
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {tag.data.title}

            <IconButton onClick={handleDelete ? () => handleDelete(tag.data) : undefined}>
              <DeleteIcon />
            </IconButton>
          </span>
        </Stack>
      )}
    </>
  );
}

export default DocumentTagRow;
