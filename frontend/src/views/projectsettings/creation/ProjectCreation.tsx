import {
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";
import SaveIcon from "@mui/icons-material/Save";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import CloseIcon from "@mui/icons-material/Close";
import { Link, useNavigate } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import { QueryKey } from "../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";

function ProjectCreation() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // mutations
  const queryClient = useQueryClient();
  const createProjectMutation = ProjectHooks.useCreateProject({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECTS]);
      SnackbarAPI.openSnackbar({
        text: "Successfully Created Project " + data.title + " with id " + data.id + "!",
        severity: "success",
      });
      navigate(`/projectsettings/${data.id}`);
    },
  });

  // form handling
  const handleProjectCreation = (data: any) => {
    createProjectMutation.mutate({
      requestBody: {
        title: data.name,
        description: data.description,
      },
    });
  };
  const handleError = (error: any) => {
    console.error(error);
  };

  return (
    <Card>
      <AppBar position="relative" color="secondary">
        <Toolbar variant="dense" sx={{ flexDirection: "column", alignItems: "flex-start" }} disableGutters>
          <Toolbar variant="dense" sx={{ width: "100%" }}>
            <Typography variant="h6" color="inherit" component="div">
              Create new project
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" startIcon={<CloseIcon />} component={Link} to="/projects">
              Close
            </Button>
          </Toolbar>
        </Toolbar>
      </AppBar>
      <form onSubmit={handleSubmit(handleProjectCreation, handleError)}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="Project name"
              variant="outlined"
              fullWidth
              {...register("name", {
                required: "Project name is required",
                validate: (value: string) => !/\s/g.test(value) || "Project name must not contain spaces",
              })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
            />
            <TextField
              label="Project description"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              {...register("description", {
                required: "Project description is required",
              })}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
            />
          </Stack>
        </CardContent>
        <Divider />
        <CardActions>
          <Box sx={{ flexGrow: 1 }} />
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            sx={{ mr: 1 }}
            type="submit"
            loading={createProjectMutation.isLoading}
            loadingPosition="start"
          >
            Create project
          </LoadingButton>
        </CardActions>
      </form>
    </Card>
  );
}

export default ProjectCreation;
