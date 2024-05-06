import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import React from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import UserName from "../../components/UserName.tsx";

interface UserSelectorProps {
  projectId: number | undefined;
  userIds: number[];
  onUserIdChange: (userIds: number[]) => void;
  title: string;
  selectMultiple?: boolean;
}

function UserSelector({ projectId, userIds, onUserIdChange, title, selectMultiple = true }: UserSelectorProps) {
  // global server state (react query)
  const projectUsers = ProjectHooks.useGetAllUsers(projectId);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    onUserIdChange(event.target.value as number[]);
  };

  // render
  return (
    <FormControl sx={{ mx: 1 }}>
      <InputLabel id="user-select-label">{title}</InputLabel>
      <Select
        labelId="user-select-label"
        label={title}
        multiple={selectMultiple}
        size="small"
        value={userIds}
        onChange={handleChange}
        disabled={!projectUsers.isSuccess}
        renderValue={(userIds) =>
          userIds.map((userId, index) => (
            <React.Fragment key={userId}>
              <UserName userId={userId} />
              {index < userIds.length - 1 && ", "}
            </React.Fragment>
          ))
        }
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

export default UserSelector;
