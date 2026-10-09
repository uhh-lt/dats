import { useWithLevel } from "@components/tree-explorer";
import { tagQueries, TagRenderer } from "@core/tag";
import { MenuItem, TextField } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, memo, useCallback } from "react";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps";

export const TagIdValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
  // global server state (react-query)
  const projectId = useAppSelector((state) => state.project.projectId);
  const projectTags = useQuery(tagQueries.byProject(projectId));
  // transform flat list into hierarchical strcutre
  const tagsWithLevel = useWithLevel(projectTags.data || []);

  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChangeValue(filterExpression.id, parseInt(event.target.value));
    },
    [filterExpression.id, onChangeValue],
  );

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={handleValueChange}
      slotProps={{
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {tagsWithLevel.map((tagWithLevel) => (
        <MenuItem
          key={tagWithLevel.data.id}
          value={tagWithLevel.data.id}
          style={{ paddingLeft: tagWithLevel.level * 10 + 6 }}
        >
          <TagRenderer tag={tagWithLevel.data} />
        </MenuItem>
      ))}
    </TextField>
  );
});
