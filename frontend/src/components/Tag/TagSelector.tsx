import {
  Checkbox,
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import React, { memo } from "react";
import TagHooks from "../../api/TagHooks.ts";
import { useWithLevel } from "../TreeExplorer/useWithLevel.ts";
import TagRenderer from "./TagRenderer.tsx";

interface TagSelectorMultipleProps {
  multiple: true;
  tagIds: number[];
  onTagIdChange: (tagIds: number[]) => void;
  title: string;
}

interface TagSelectorSingleProps {
  multiple?: false;
  tagIds: number | null;
  onTagIdChange: (tagId: number | null) => void;
  title: string;
}

type TagSelectorProps = (TagSelectorMultipleProps | TagSelectorSingleProps) & FormControlProps;

/**
 * A selector component for tags that supports both single and multiple selection modes.
 * @param tagIds - The selected tag ID(s). For single mode, use number | null. For multiple mode, use number[].
 * @param onTagIdChange - Callback when selection changes.
 * @param title - The label for the selector.
 * @param multiple - If true, allows multiple tag selection.
 */
function TagSelector({ tagIds, onTagIdChange, title, multiple, ...props }: TagSelectorProps) {
  // global server state (react query)
  const projectTags = TagHooks.useGetAllTags();
  // transform flat list into hierarchical structure
  const tagsWithLevel = useWithLevel(projectTags.data || []);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number | number[]>) => {
    if (multiple) {
      (onTagIdChange as (tagIds: number[]) => void)(event.target.value as number[]);
    } else {
      let value: number | null;
      if (typeof event.target.value === "string") {
        value = parseInt(event.target.value, 10);
      } else {
        value = event.target.value as number;
      }
      (onTagIdChange as (tagId: number | null) => void)(value === -1 ? null : value);
    }
  };

  // render
  return (
    <FormControl {...props}>
      <InputLabel id="tag-select-label">{title}</InputLabel>
      <Select
        labelId="tag-select-label"
        label={title}
        value={multiple ? tagIds : tagIds ?? -1}
        multiple={multiple}
        onChange={handleChange}
        disabled={!projectTags.isSuccess}
        fullWidth
        renderValue={(selected) => {
          if (multiple) {
            const tagIdsArray = selected as number[];
            return (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {tagIdsArray.map((tagId, index) => (
                  <React.Fragment key={tagId}>
                    <TagRenderer tag={tagId} />
                    {index < tagIdsArray.length - 1 && ", "}
                  </React.Fragment>
                ))}
              </Stack>
            );
          } else {
            const tagId = selected as number;
            return tagId === -1 ? "All Tags" : <TagRenderer tag={tagId} />;
          }
        }}
      >
        {!multiple && (
          <MenuItem value={-1} style={{ paddingLeft: 8 }}>
            <ListItemText>All tags</ListItemText>
          </MenuItem>
        )}
        {tagsWithLevel.map((tagWithLevel) => (
          <MenuItem
            key={tagWithLevel.data.id}
            value={tagWithLevel.data.id}
            style={{ paddingLeft: tagWithLevel.level * 10 + 6 }}
          >
            {multiple && <Checkbox checked={(tagIds as number[]).indexOf(tagWithLevel.data.id) !== -1} />}
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
