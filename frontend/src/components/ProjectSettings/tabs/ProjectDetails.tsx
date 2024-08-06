import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, CardActions, CardContent, Divider, Stack, TextField } from "@mui/material";
import { useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { ProjectUpdate } from "../../../api/openapi/models/ProjectUpdate.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import FormText from "../../FormInputs/FormText.tsx";
import FormTextMultiline from "../../FormInputs/FormTextMultiline.tsx";
import { ProjectProps } from "../ProjectProps.ts";

function ProjectDetails({ project }: ProjectProps) {
  const { user } = useAuth();
  const {
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<ProjectUpdate>();

  // mutations
  const updateProjectMutation = ProjectHooks.useUpdateProject();

  // form default values (only changed when project changes!)
  useEffect(() => {
    setValue("title", project.title);
    setValue("description", project.description);
  }, [project, setValue]);

  // form handling
  const handleProjectUpdate: SubmitHandler<ProjectUpdate> = (data) => {
    if (!user?.id) return;

    updateProjectMutation.mutate({
      userId: user.id!,
      projId: project.id,
      requestBody: data,
    });
  };
  const handleError: SubmitErrorHandler<ProjectUpdate> = (error) => {
    console.error(error);
  };

  return (
    <form onSubmit={handleSubmit(handleProjectUpdate, handleError)}>
      <CardContent>
        <Stack spacing={2}>
          <FormText
            name="title"
            control={control}
            rules={{
              required: "Project name is required",
            }}
            textFieldProps={{
              label: "Project name",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.title),
              helperText: <ErrorMessage errors={errors} name="title" />,
            }}
          />
          <FormTextMultiline
            name="description"
            control={control}
            rules={{
              required: "Project description is required",
            }}
            textFieldProps={{
              label: "Project description",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.description),
              helperText: <ErrorMessage errors={errors} name="description" />,
            }}
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
          loading={updateProjectMutation.isPending}
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
