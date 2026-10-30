import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";
import { isDifferent, SelectionDefinition, SelectionItem } from "../_hooks/usePromptTemplateEditor";
import { SelectionEditDialog } from "./SelectionEditDialog";

interface SelectionPanelProps {
  // the selector of the project data, e.g. the code selector
  selector: ReactNode;
  // the selections of the prompt with the project's definitions
  items: SelectionItem[];
  // what a selection is, e.g. "code"
  noun: string;
  onEdit: (definition: SelectionDefinition) => void;
  onRemove: (id: number) => void;
}

/** Selects the codes, tags or metadata fields of a block and lists them as the prompt defines them. */
export function SelectionPanel({ selector, items, noun, onEdit, onRemove }: SelectionPanelProps) {
  return (
    <Stack spacing={1}>
      {selector}
      {items.map((item) => (
        <SelectionRow key={item.local.id} item={item} noun={noun} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </Stack>
  );
}

interface SelectionRowProps {
  item: SelectionItem;
  noun: string;
  onEdit: (definition: SelectionDefinition) => void;
  onRemove: (id: number) => void;
}

function SelectionRow({ item, noun, onEdit, onRemove }: SelectionRowProps) {
  const { local } = item;
  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ pl: 1, borderLeft: 2, borderColor: "divider" }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: "break-word" }}>
            {local.name}
          </Typography>
          {local.type && (
            <Typography variant="caption" color="text.secondary">
              {local.type}
            </Typography>
          )}
          {item.project === undefined ? (
            <Tooltip title={`The ${noun} was deleted from the project. Remove it from the prompt.`}>
              <Chip size="small" color="error" variant="outlined" label="deleted" />
            </Tooltip>
          ) : (
            isDifferent(item) && (
              <Tooltip
                title={`The prompt defines the ${noun} differently than the project. Pull or push to align them.`}
              >
                <Chip size="small" color="warning" variant="outlined" label="differs from project" />
              </Tooltip>
            )
          )}
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontStyle: local.description ? undefined : "italic",
          }}
        >
          {local.description || "No description"}
        </Typography>
      </Box>
      <SelectionEditDialog definition={local} noun={noun} onSave={onEdit} />
      <Tooltip title={`Remove the ${noun} from the prompt`}>
        <IconButton size="small" onClick={() => onRemove(local.id)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
