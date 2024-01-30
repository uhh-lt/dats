import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, CardActions, CardContent, Divider, Stack, TextField } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import ProjectHooks from "../../../api/ProjectHooks";
import { useAuth } from "../../../auth/AuthProvider";
import { ProjectProps } from "./ProjectProps";

function ProjectDetails({ project }: ProjectProps) {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm();

  // mutations
  const updateProjectMutation = ProjectHooks.useUpdateProject();

  // form default values (only changed when project changes!)
  useEffect(() => {
    setValue("name", project.title);
    setValue("description", project.description);
  }, [project, setValue]);

  // form handling
  const handleProjectUpdate = (data: any) => {
    if (!user?.id) return;

    updateProjectMutation.mutate({
      userId: user.id!,
      projId: project.id,
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
    <form onSubmit={handleSubmit(handleProjectUpdate, handleError)}>
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
          loading={updateProjectMutation.isLoading}
          loadingPosition="start"
          disabled={!user}
        >
          Update project
        </LoadingButton>
      </CardActions>
    </form>
  );
}

export default ProjectDetails;
