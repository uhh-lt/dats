import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { LoadingButton } from "@mui/lab";
import {
  Autocomplete,
  Box,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import UserHooks from "../../../api/UserHooks.ts";
import { PublicUserRead } from "../../../api/openapi/models/PublicUserRead.ts";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import { ProjectProps } from "./ProjectProps.ts";

function ProjectUsers({ project }: ProjectProps) {
  const [selectedUser, setSelectedUser] = useState<PublicUserRead | null>(null);

  // query all users that belong to the project
  const allUsers = UserHooks.useGetAll();
  const projectUsers = ProjectHooks.useGetAllUsers(project.id);

  // list of users that are not associated with the project
  const autoCompleteUsers = useMemo(() => {
    if (!allUsers.data || !projectUsers.data) {
      return [];
    }

    const projectUserIds = projectUsers.data.map((user) => user.id);

    return allUsers.data.filter((user) => projectUserIds.indexOf(user.id) === -1);
  }, [projectUsers.data, allUsers.data]);

  // add user
  const addUserMutation = ProjectHooks.useAddUser();
  const handleClickAddUser = () => {
    if (!selectedUser) return;
    addUserMutation.mutate(
      {
        projId: project.id,
        userId: selectedUser.id,
      },
      {
        onSuccess: () => setSelectedUser(null),
      },
    );
  };

  // remove user
  const removeUserMutation = ProjectHooks.useRemoveUser();
  const handleClickRemoveUser = (userId: number) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the User ${userId} from this project? You can add her again.`,
      onAccept: () => {
        removeUserMutation.mutate({
          projId: project.id,
          userId: userId,
        });
      },
    });
  };

  const handleChangeSelectedUser = (_event: React.SyntheticEvent, value: PublicUserRead | null) => {
    setSelectedUser(value);
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" className="myFlexFitContentContainer">
        <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
          <Box sx={{ flex: "1 1 0", display: "flex", alignItems: "center" }}>
            <Typography variant="h6" color="inherit" component="div">
              Add user
            </Typography>
            {allUsers.isError ? (
              <Typography>Error: {allUsers.error.message}</Typography>
            ) : (
              <Autocomplete
                value={selectedUser}
                onChange={handleChangeSelectedUser}
                sx={{ ml: 1, flexGrow: 1 }}
                size="small"
                disablePortal
                options={autoCompleteUsers}
                renderInput={(params) => <TextField {...params} label="User" />}
                disabled={!allUsers.isSuccess}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
              />
            )}
            <LoadingButton
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ml: 1 }}
              onClick={handleClickAddUser}
              disabled={selectedUser === null}
              loading={addUserMutation.isPending}
              loadingPosition="start"
            >
              Add
            </LoadingButton>
          </Box>
        </Stack>
      </Toolbar>
      <Divider />
      {projectUsers.isLoading && <CardContent>Loading users...</CardContent>}
      {projectUsers.isError && (
        <CardContent>An error occurred while loading project users for project {project.id}...</CardContent>
      )}
      {projectUsers.isSuccess && (
        <List style={{ maxHeight: "100%" }}>
          {projectUsers.data.map((user) => (
            <ListItem
              disablePadding
              key={user.id}
              secondaryAction={
                <Tooltip title={"Remove user from project"}>
                  <span>
                    <IconButton onClick={() => handleClickRemoveUser(user.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemButton>
                <ListItemText primary={user.first_name + " " + user.last_name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default ProjectUsers;
