import { Checkbox, ListItemText, MenuItem, Select, SelectChangeEvent, Stack, StackProps } from "@mui/material";
import Typography from "@mui/material/Typography";
import React from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import UserName from "../../components/UserName.tsx";

interface UserSelectorProps {
  projectId: number | undefined;
  userIds: number[];
  onUserIdChange: (userIds: number[]) => void;
  title: string;
}

function UserSelector({
  projectId,
  userIds,
  onUserIdChange,
  title,
  ...props
}: UserSelectorProps & Omit<StackProps, "direction" | "alignItems">) {
  // global server state (react query)
  const projectUsers = ProjectHooks.useGetAllUsers(projectId);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    onUserIdChange(event.target.value as number[]);
  };

  // render
  return (
    <Stack direction="row" alignItems="center" {...props}>
      <Typography variant="body1" color="inherit" component="div" className="overflow-ellipsis" flexShrink={0}>
        {title}
      </Typography>
      <Select
        sx={{ ml: 1, backgroundColor: "white" }}
        multiple
        fullWidth
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
    </Stack>
  );
}

export default UserSelector;
