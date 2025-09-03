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
import React, { memo, useCallback } from "react";
import TagHooks from "../../api/TagHooks.ts";
import { useWithLevel } from "../TreeExplorer/useWithLevel.ts";
import TagRenderer from "./TagRenderer.tsx";

interface TagSelectorProps {
  tagIds: number[];
  onTagIdChange: (userIds: number[]) => void;
  title: string;
}

function TagSelectorMulti({ tagIds, onTagIdChange, title, ...props }: TagSelectorProps & FormControlProps) {
  // global server state (react query)
  const projectTags = TagHooks.useGetAllTags();
  // transform flat list into hierarchical strcutre
  const tagsWithLevel = useWithLevel(projectTags.data || []);

  // handlers (for ui)
  const handleChange = useCallback(
    (event: SelectChangeEvent<number[]>) => {
      onTagIdChange(event.target.value as number[]);
    },
    [onTagIdChange],
  );

  // render
  const renderValue = useCallback(
    (tagIds: number[]) => (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {tagIds.map((tagId, index) => (
          <React.Fragment key={tagId}>
            <TagRenderer tag={tagId} />
            {index < tagIds.length - 1 && ", "}
          </React.Fragment>
        ))}
      </Stack>
    ),
    [],
  );

  return (
    <FormControl {...props}>
      <InputLabel id="multi-user-select-label">{title}</InputLabel>
      <Select
        labelId="multi-user-select-label"
        label={title}
        value={tagIds}
        multiple
        onChange={handleChange}
        disabled={!projectTags.isSuccess}
        fullWidth
        renderValue={renderValue}
      >
        {tagsWithLevel.map((tagWithLevel) => (
          <MenuItem
            key={tagWithLevel.data.id}
            value={tagWithLevel.data.id}
            style={{ paddingLeft: tagWithLevel.level * 10 + 6 }}
          >
            <Checkbox checked={tagIds.indexOf(tagWithLevel.data.id) !== -1} />
            <ListItemText>
              <TagRenderer tag={tagWithLevel.data} />
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default memo(TagSelectorMulti);
