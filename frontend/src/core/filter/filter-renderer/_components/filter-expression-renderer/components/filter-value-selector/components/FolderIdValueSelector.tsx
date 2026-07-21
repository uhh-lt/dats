import { FolderHooks } from "@api/hooks/FolderHooks";
import { useWithLevel } from "@components/tree-explorer";
import { FolderRenderer } from "@core/folder";
import { FolderType } from "@models/FolderType";
import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent, memo, useCallback } from "react";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps";

export const FolderIdValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
  // global server state (react-query)
  const projectFolders = FolderHooks.useGetAllFolders();
  // transform flat list into hierarchical structure
  const foldersWithLevel = useWithLevel(projectFolders.data || []);

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
      {foldersWithLevel.map((folderWithLevel) => (
        <MenuItem
          key={folderWithLevel.data.id}
          value={folderWithLevel.data.id}
          style={{ paddingLeft: folderWithLevel.level * 10 + 6 }}
        >
          <FolderRenderer folder={folderWithLevel.data} folderType={FolderType.NORMAL} renderIcon renderName />
        </MenuItem>
      ))}
    </TextField>
  );
});
