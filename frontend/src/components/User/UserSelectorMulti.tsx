import {
  Checkbox,
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import React, { memo, useCallback } from "react";
import UserHooks from "../../api/UserHooks.ts";
import UserName from "./UserName.tsx";

interface UserSelectorProps {
  userIds: number[];
  onUserIdChange: (userIds: number[]) => void;
  title: string;
}

function UserSelectorMulti({ userIds, onUserIdChange, title, ...props }: UserSelectorProps & FormControlProps) {
  // global server state (react query)
  const projectUsers = UserHooks.useGetAllUsers();

  // handlers (for ui)
  const handleChange = useCallback(
    (event: SelectChangeEvent<number[]>) => {
      onUserIdChange(event.target.value as number[]);
    },
    [onUserIdChange],
  );

  // render
  const renderValue = useCallback(
    (userIds: number[]) =>
      userIds.map((userId, index) => (
        <React.Fragment key={userId}>
          <UserName userId={userId} />
          {index < userIds.length - 1 && ", "}
        </React.Fragment>
      )),
    [],
  );

  return (
    <FormControl {...props}>
      <InputLabel id="multi-user-select-label">{title}</InputLabel>
      <Select
        labelId="multi-user-select-label"
        label={title}
        value={userIds}
        multiple
        onChange={handleChange}
        disabled={!projectUsers.isSuccess}
        fullWidth
        renderValue={renderValue}
      >
        {projectUsers.isSuccess &&
          projectUsers.data.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              <Checkbox checked={userIds.indexOf(user.id) !== -1} />
              <ListItemText>
                <UserName userId={user.id} />
              </ListItemText>
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
}

export default memo(UserSelectorMulti);
