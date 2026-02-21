import { FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { memo, useCallback } from "react";
import { UserHooks } from "../../../api/UserHooks.ts";
import { UserRenderer } from "../renderer/UserRenderer.tsx";

interface UserSelectorProps {
  userId: number;
  onUserIdChange: (userIds: number) => void;
  title: string;
}

export const UserSelectorSingle = memo(({ userId, onUserIdChange, title }: UserSelectorProps) => {
  // global server state (react query)
  const projectUsers = UserHooks.useGetAllUsers();

  // handlers (for ui)
  const handleChange = useCallback(
    (event: SelectChangeEvent<number>) => {
      onUserIdChange(parseInt(event.target.value as string));
    },
    [onUserIdChange],
  );

  // render
  const renderValue = useCallback((userId: number) => <UserRenderer user={userId} />, []);

  return (
    <FormControl sx={{ mx: 1 }}>
      <InputLabel id="user-select-label">{title}</InputLabel>
      <Select
        labelId="user-select-label"
        label={title}
        size="small"
        value={userId}
        onChange={handleChange}
        disabled={!projectUsers.isSuccess}
        renderValue={renderValue}
      >
        {projectUsers.isSuccess &&
          projectUsers.data.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              <ListItemText>
                <UserRenderer user={user.id} />
              </ListItemText>
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
});
