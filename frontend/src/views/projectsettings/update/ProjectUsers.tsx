import React, { useState } from "react";
import {
  Box,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProjectRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import { QueryKey } from "../../../api/QueryKey";
import { LoadingButton } from "@mui/lab";

interface ProjectUsersProps {
  project: ProjectRead;
}

function ProjectUsers({ project }: ProjectUsersProps) {
  const [userSearch, setUserSearch] = useState("");
  const queryClient = useQueryClient();

  // query all users that belong to the project
  const projectUsers = ProjectHooks.useGetAllUsers(project.id);

  // add user
  const addUserMutation = ProjectHooks.useAddUser({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, project.id]);
      SnackbarAPI.openSnackbar({
        text: "Successfully added user " + data.first_name + "!",
        severity: "success",
      });
      setUserSearch("");
    },
  });
  const handleClickAddUser = () => {
    addUserMutation.mutate({
      projId: project.id,
      userId: parseInt(userSearch),
    });
  };

  // remove user
  const removeUserMutation = ProjectHooks.useRemoveUser({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, project.id]);
      SnackbarAPI.openSnackbar({
        text: "Successfully removed user " + data.first_name + "!",
        severity: "success",
      });
    },
  });
  const handleClickRemoveUser = (userId: number) => {
    removeUserMutation.mutate({
      projId: project.id,
      userId: userId,
    });
  };

  return (
    <React.Fragment>
      <Toolbar variant="dense">
        <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
          <Box sx={{ flex: "1 1 0", display: "flex", alignItems: "center" }}>
            <Typography variant="h6" color="inherit" component="div">
              Add user
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search users..."
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
            <LoadingButton
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ml: 1 }}
              onClick={handleClickAddUser}
              disabled={userSearch.length <= 0}
              loading={addUserMutation.isLoading}
              loadingPosition="start"
            >
              Add
            </LoadingButton>
          </Box>
          <Typography variant="h6" color="inherit" component="div" sx={{ flex: "1 1 0" }}>
            Permission for User 1
          </Typography>
        </Stack>
      </Toolbar>
      <Divider />
      {projectUsers.isLoading && <CardContent>Loading project users...</CardContent>}
      {projectUsers.isError && (
        <CardContent>An error occurred while loading project documents for project {project.id}...</CardContent>
      )}
      {projectUsers.isSuccess && (
        <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
          <Box sx={{ flex: "1 1 0" }}>
            <List>
              {projectUsers.data.map((user) => (
                <ListItem
                  disablePadding
                  key={user.id}
                  secondaryAction={
                    <IconButton onClick={() => handleClickRemoveUser(user.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton>
                    <ListItemText primary={user.first_name + " " + user.last_name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
          <Box sx={{ flex: "1 1 0" }}>
            <FormGroup>
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can Search?" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can upload files?" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can delete files?" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can annotate?" />
            </FormGroup>
          </Box>
        </Stack>
      )}
    </React.Fragment>
  );
}

export default ProjectUsers;
