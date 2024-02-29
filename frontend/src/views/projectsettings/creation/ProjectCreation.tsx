import { ErrorMessage } from "@hookform/error-message";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
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
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { ProjectCreate } from "../../../api/openapi/models/ProjectCreate.ts";

function ProjectCreation() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectCreate>();

  // mutations
  const createProjectMutation = ProjectHooks.useCreateProject();

  // form handling
  const handleProjectCreation: SubmitHandler<ProjectCreate> = (data) => {
    createProjectMutation.mutate(
      {
        requestBody: {
          title: data.title,
          description: data.description,
        },
      },
      {
        onSuccess: (project) => navigate(`/projectsettings/${project.id}`),
      },
    );
  };
  const handleError: SubmitErrorHandler<ProjectCreate> = (error) => {
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
              {...register("title", {
                required: "Project name is required",
                // validate: (value: string) => !/\s/g.test(value) || "Project name must not contain spaces",
              })}
              error={Boolean(errors.title)}
              helperText={<ErrorMessage errors={errors} name="title" />}
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
              disabled
            />
            <TextField
              label="Materials"
              placeholder="What kind of materials are you using in your project?"
              variant="outlined"
              fullWidth
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
            loading={createProjectMutation.isPending}
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
