import { Box, CardActions, CardContent, Divider, Stack, TextField } from "@mui/material";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import SaveIcon from "@mui/icons-material/Save";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { ProjectRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import { QueryKey } from "../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { useAuth } from "../../../auth/AuthProvider";

interface ProjectDetailsProps {
  project: ProjectRead;
}

function ProjectDetails({ project }: ProjectDetailsProps) {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm();

  // mutations
  const queryClient = useQueryClient();
  const updateProjectMutation = ProjectHooks.useUpdateProject({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, user.data?.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT, data.id]);
      SnackbarAPI.openSnackbar({
        text: "Successfully Updated Project with id " + data.id + "!",
        severity: "success",
      });
    },
  });

  // form default values (only changed when project changes!)
  useEffect(() => {
    setValue("name", project.title);
    setValue("description", project.description);
  }, [project, setValue]);

  // form handling
  const handleProjectUpdate = (data: any) => {
    if (!user.data?.id) return;

    updateProjectMutation.mutate({
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
          loading={updateProjectMutation.isLoading}
          loadingPosition="start"
          disabled={!user.data}
        >
          Update project
        </LoadingButton>
      </CardActions>
    </form>
  );
}

export default ProjectDetails;
