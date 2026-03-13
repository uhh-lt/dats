import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { ProjectRead } from "@api/models/ProjectRead";
import { ProjectUpdate } from "@api/models/ProjectUpdate";
import { FormText, FormTextMultiline } from "@components/form-inputs";
import { ProjectExportButton } from "@core/project";
import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, CardActions, CardContent, Divider, Stack } from "@mui/material";
import { memo, useCallback } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

interface ProjectDetailsProps {
  project: ProjectRead;
}

export const ProjectDetails = memo(({ project }: ProjectDetailsProps) => {
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
        <ProjectExportButton />
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          sx={{ mr: 1 }}
          type="submit"
          loading={updateProjectMutation.isPending}
          loadingPosition="start"
        >
          Update project
        </Button>
      </CardActions>
    </form>
  );
});
