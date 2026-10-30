import { AttachedObjectRenderer } from "@core/memo";
import { Box } from "@mui/material";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { memo } from "react";

interface AgentEntityChipProps {
  type: AttachedObjectType;
  id: number;
}

// documents and annotations have their own page
const LINKED_TYPES: readonly AttachedObjectType[] = [
  AttachedObjectType.SOURCE_DOCUMENT,
  AttachedObjectType.SPAN_ANNOTATION,
  AttachedObjectType.SENTENCE_ANNOTATION,
  AttachedObjectType.BBOX_ANNOTATION,
];

/** A DATS entity inline in the chat, rendered by its entity renderer (documents and annotations open on click). */
export const AgentEntityChip = memo(({ type, id }: AgentEntityChipProps) => {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        verticalAlign: "middle",
        maxWidth: "100%",
        px: 0.75,
        py: 0.125,
        mx: 0.25,
        borderRadius: 1,
        bgcolor: "grey.100",
        border: 1,
        borderColor: "divider",
        fontSize: "0.875em",
        "& a": { color: "inherit" },
      }}
    >
      <AttachedObjectRenderer attachedObjectType={type} attachedObjectId={id} link={LINKED_TYPES.includes(type)} />
    </Box>
  );
});
