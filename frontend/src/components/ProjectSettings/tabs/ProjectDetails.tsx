import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, CardActions, CardContent, Divider, Stack } from "@mui/material";
import { memo, useCallback } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { ProjectHooks } from "../../../api/ProjectHooks.ts";
import { ProjectUpdate } from "../../../api/openapi/models/ProjectUpdate.ts";
import { ExportProjectButton } from "../../Export/ExportProjectButton.tsx";
import { FormText } from "../../FormInputs/FormText.tsx";
import { FormTextMultiline } from "../../FormInputs/FormTextMultiline.tsx";
import { ProjectProps } from "../ProjectProps.ts";

export const ProjectDetails = memo(({ project }: ProjectProps) => {
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<ProjectUpdate>({
    defaultValues: {
      title: project.title,
      description: project.description,
    },
  });

  // mutations
  const updateProjectMutation = ProjectHooks.useUpdateProject();

  // form handling
  const handleProjectUpdate: SubmitHandler<ProjectUpdate> = useCallback(
    (data) => {
      updateProjectMutation.mutate({
        projId: project.id,
        requestBody: data,
      });
    },
    [updateProjectMutation, project.id],
  );

  const handleError: SubmitErrorHandler<ProjectUpdate> = useCallback((error) => {
    console.error(error);
  }, []);

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
        </Stack>
      </CardContent>
      <Divider />
      <CardActions>
        <ExportProjectButton />
        <Box sx={{ flexGrow: 1 }} />
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          sx={{ mr: 1 }}
          type="submit"
          loading={updateProjectMutation.isPending}
          loadingPosition="start"
        >
          Update project
        </LoadingButton>
      </CardActions>
    </form>
  );
});
