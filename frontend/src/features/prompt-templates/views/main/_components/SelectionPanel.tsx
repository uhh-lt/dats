import { List, Stack } from "@mui/material";
import { ReactNode } from "react";
import { SelectionDefinition, SelectionItem } from "../_hooks/usePromptTemplateEditor";
import { SelectionEditDialog } from "./SelectionEditDialog";

interface SelectionPanelProps {
  // the selector of the project data, e.g. the code selector
  selector: ReactNode;
  // the selections of the prompt with the project's definitions
  items: SelectionItem[];
  // what a selection is, e.g. "code"
  noun: string;
  // the icon of a selection, e.g. the colored square of a code
  renderIcon: (item: SelectionItem) => ReactNode;
  onEdit: (definition: SelectionDefinition) => void;
  onRemove: (id: number) => void;
}

/** Selects the codes, tags or metadata fields of a block and lists them as the prompt defines them. */
export function SelectionPanel({ selector, items, noun, renderIcon, onEdit, onRemove }: SelectionPanelProps) {
  return (
    <Stack spacing={0.5}>
      {selector}
      <List dense disablePadding>
        {items.map((item) => (
          <SelectionEditDialog
            key={item.local.id}
            item={item}
            noun={noun}
            icon={renderIcon(item)}
            onSave={onEdit}
            onRemove={onRemove}
          />
        ))}
      </List>
    </Stack>
  );
}
