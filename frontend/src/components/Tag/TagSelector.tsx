import {
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { memo, useCallback } from "react";
import TagHooks from "../../api/TagHooks.ts";
import { useWithLevel } from "../TreeExplorer/useWithLevel.ts";
import TagRenderer from "./TagRenderer.tsx";

interface TagSelectorProps {
  tagId: number | null;
  onTagIdChange: (tagId: number | null) => void;
  title: string;
}

function TagSelector({ tagId, onTagIdChange, title, ...props }: TagSelectorProps & FormControlProps) {
  // global server state (react query)
  const projectTags = TagHooks.useGetAllTags();
  // transform flat list into hierarchical strcutre
  const tagsWithLevel = useWithLevel(projectTags.data || []);

  // handlers (for ui)
  const handleChange = useCallback(
    (event: SelectChangeEvent<number>) => {
      let value: number | null;
      if (typeof event.target.value === "string") {
        value = parseInt(event.target.value, 10);
      } else {
        value = event.target.value;
      }
      onTagIdChange(value === -1 ? null : value);
    },
    [onTagIdChange],
  );

  // render
  const renderValue = useCallback((tagId: number) => (tagId === -1 ? "All Tags" : <TagRenderer tag={tagId} />), []);

  return (
    <FormControl {...props}>
      <InputLabel id="multi-user-select-label">{title}</InputLabel>
      <Select
        labelId="multi-user-select-label"
        label={title}
        value={tagId || -1}
        onChange={handleChange}
        disabled={!projectTags.isSuccess}
        fullWidth
        renderValue={renderValue}
      >
        <MenuItem value={-1} style={{ paddingLeft: 8 }}>
          <ListItemText>All tags</ListItemText>
        </MenuItem>
        {tagsWithLevel.map((tagWithLevel) => (
          <MenuItem
            key={tagWithLevel.data.id}
            value={tagWithLevel.data.id}
            style={{ paddingLeft: tagWithLevel.level * 10 + 6 }}
          >
            <ListItemText>
              <TagRenderer tag={tagWithLevel.data} />
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default memo(TagSelector);
