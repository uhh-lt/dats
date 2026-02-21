import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent, memo, useCallback } from "react";
import { UserHooks } from "../../../../api/UserHooks.ts";
import { UserRenderer } from "../../../../core/user/renderer/UserRenderer.tsx";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps.ts";

const UserIdValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
  // global server state (react-query)
  const projectUsers = UserHooks.useGetAllUsers();

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
      {projectUsers.data?.map((user) => (
        <MenuItem key={user.id} value={user.id}>
          <UserRenderer user={user} />
        </MenuItem>
      ))}
    </TextField>
  );
});
