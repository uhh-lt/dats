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
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import CloseIcon from "@mui/icons-material/Close";
import { Link, useNavigate } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { useAuth } from "../../../auth/AuthProvider";

function ProjectCreation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // mutations
  const createProjectMutation = ProjectHooks.useCreateProject();

  // form handling
  const handleProjectCreation = (data: any) => {
    if (!user.data) return;
    createProjectMutation.mutate(
      {
        userId: user.data.id,
        requestBody: {
          title: data.name,
          description: data.description,
        },
      },
      {
        onSuccess: (project) => {
          SnackbarAPI.openSnackbar({
            text: "Successfully Created Project " + project.title + " with id " + project.id + "!",
            severity: "success",
          });
          navigate(`/projectsettings/${project.id}`);
        },
      },
    );
  };
  const handleError = (error: any) => {
    console.error(error);
  };

  return (
    <Card>
      <AppBar position="relative">
        <Toolbar variant="dense" sx={{ flexDirection: "column", alignItems: "flex-start" }} disableGutters>
          <Toolbar variant="dense" sx={{ width: "100%" }}>
            <Typography variant="h6" color="inherit" component="div">
              Create new project
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" color="secondary" startIcon={<CloseIcon />} component={Link} to="/projects">
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
                // validate: (value: string) => !/\s/g.test(value) || "Project name must not contain spaces",
              })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
            />
            <TextField
              label="Project description"
              placeholder="Describe your project aim, method, and material used in a short abstract."
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
            <TextField
              label="Method"
              placeholder="Which method(s) are you using in your project?"
              variant="outlined"
              fullWidth
              {...register("method")}
              error={Boolean(errors.method)}
              helperText={<ErrorMessage errors={errors} name="method" />}
              disabled
            />
            <TextField
              label="Materials"
              placeholder="What kind of materials are you using in your project?"
              variant="outlined"
              fullWidth
              {...register("materials")}
              error={Boolean(errors.materials)}
              helperText={<ErrorMessage errors={errors} name="materials" />}
              disabled
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
            disabled={!user.data}
          >
            Create project
          </LoadingButton>
        </CardActions>
      </form>
    </Card>
  );
}

export default ProjectCreation;
