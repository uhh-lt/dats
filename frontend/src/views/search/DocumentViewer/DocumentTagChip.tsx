import TagHooks from "../../../api/TagHooks";
import { Chip, Tooltip } from "@mui/material";
import React from "react";
import { DocumentTagRead } from "../../../api/openapi";
import CancelIcon from "@mui/icons-material/Cancel";

interface DocumentTagChipProps {
  tagId: number;
  handleClick?: (tag: DocumentTagRead) => void;
  handleDelete: (tag: DocumentTagRead) => void;
}

function DocumentTagChip({ tagId, handleClick, handleDelete }: DocumentTagChipProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <>
      {tag.isLoading && <Chip variant="outlined" label="Loading..." />}
      {tag.isError && <Chip variant="outlined" label={tag.error.message} />}
      {tag.isSuccess && (
        <Chip
          label={tag.data.title}
          variant="outlined"
          onClick={handleClick ? () => handleClick(tag.data) : undefined}
          onDelete={() => handleDelete(tag.data)}
          sx={{ borderColor: tag.data.color, color: tag.data.color }}
          deleteIcon={
            <Tooltip title="Remove tag">
              <CancelIcon style={{ color: tag.data.color }} />
            </Tooltip>
          }
        />
      )}
    </>
  );
}

export default DocumentTagChip;
