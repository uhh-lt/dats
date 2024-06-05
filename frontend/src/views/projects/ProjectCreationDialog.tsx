import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { ProjectCreate } from "../../api/openapi/models/ProjectCreate.ts";

interface ProjectCreationDialogProps {
  open: boolean;
  onClose: () => void;
}

function ProjectCreationDialog({ open, onClose }: ProjectCreationDialogProps) {
  // project creation
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectCreate>();
  const createProjectMutation = ProjectHooks.useCreateProject();
  const handleProjectCreation: SubmitHandler<ProjectCreate> = (data) => {
    createProjectMutation.mutate(
      {
        requestBody: {
          title: data.title,
          description: data.description,
        },
      },
      {
        onSuccess: (project) => navigate(`/project/${project.id}/search`),
      },
    );
  };
  const handleError: SubmitErrorHandler<ProjectCreate> = (error) => {
    console.error(error);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleProjectCreation, handleError)}>
        <DialogTitle>Create new project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
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
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default ProjectCreationDialog;
