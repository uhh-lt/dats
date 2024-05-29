import CancelIcon from "@mui/icons-material/Cancel";
import { Chip, Tooltip } from "@mui/material";
import TagHooks from "../../../api/TagHooks.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";

interface DocumentTagChipProps {
  tagId: number;
  handleClick?: (tag: DocumentTagRead) => void;
  handleDelete?: (tag: DocumentTagRead) => void;
}

function DocumentTagChip({ tagId, handleClick, handleDelete }: DocumentTagChipProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <>
      {tag.isLoading && <Chip variant="outlined" label="Loading..." />}
      {tag.isError && <Chip variant="outlined" label={tag.error.message} />}
      {tag.isSuccess && (
        <Chip
          label={tag.data.name}
          variant="outlined"
          onClick={handleClick ? () => handleClick(tag.data) : undefined}
          onDelete={handleDelete ? () => handleDelete(tag.data) : undefined}
          sx={{ borderColor: tag.data.color, color: tag.data.color }}
          deleteIcon={
            handleDelete ? (
              <Tooltip title="Remove tag">
                <CancelIcon style={{ color: tag.data.color }} />
              </Tooltip>
            ) : undefined
          }
        />
      )}
    </>
  );
}

export default DocumentTagChip;
