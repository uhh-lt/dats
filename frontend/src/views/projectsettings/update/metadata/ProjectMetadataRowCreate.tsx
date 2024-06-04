import { ErrorMessage } from "@hookform/error-message";
import { Add } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { MenuItem, Stack, TextField } from "@mui/material";
import { useCallback } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import ProjectMetadataHooks from "../../../../api/ProjectMetadataHooks.ts";
import { DocType } from "../../../../api/openapi/models/DocType.ts";
import { MetaType } from "../../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataCreate } from "../../../../api/openapi/models/ProjectMetadataCreate.ts";
import { useOpenSnackbar } from "../../../../components/SnackbarDialog/useOpenSnackbar.ts";

function ProjectMetadataRowCreate({ docType, projectId }: { docType: DocType; projectId: number }) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectMetadataCreate>();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // form handling
  const createMutation = ProjectMetadataHooks.useCreateMetadata();
  const handleCreateMetadata: SubmitHandler<ProjectMetadataCreate> = useCallback(
    (data) => {
      const mutation = createMutation.mutate;
      mutation(
        {
          requestBody: {
            doctype: docType,
            metatype: data.metatype,
            key: data.key,
            project_id: projectId,
            read_only: false,
          },
        },
        {
          onSuccess: (projectMetadata) => {
            openSnackbar({
              text: `Created projectMetadata '${projectMetadata.key}' for project ${projectMetadata.project_id}`,
              severity: "success",
            });
          },
        },
      );
    },
    [createMutation.mutate, docType, openSnackbar, projectId],
  );
  const handleError: SubmitErrorHandler<ProjectMetadataCreate> = useCallback((data) => console.error(data), []);

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(handleCreateMetadata, handleError)}
    >
      <Add fontSize="medium" sx={{ my: "5px", mr: 1, mt: 2.5 }} />
      <TextField
        {...register("key", { required: "Key is required" })}
        error={Boolean(errors.key)}
        helperText={<ErrorMessage errors={errors} name="key" />}
        label="Metadata key"
        variant="standard"
        sx={{ flexGrow: 1, flexBasis: 1 }}
      />
      <TextField
        {...register("metatype", { required: "Value is required" })}
        error={Boolean(errors.metatype)}
        helperText={<ErrorMessage errors={errors} name="metatype" />}
        label="Metadata type"
        select
        variant="standard"
        defaultValue=""
        sx={{ flexGrow: 1, flexBasis: 1 }}
      >
        {Object.values(MetaType).map((metaType) => (
          <MenuItem key={metaType} value={metaType}>
            {metaType}
          </MenuItem>
        ))}
      </TextField>
      <LoadingButton
        sx={{ px: 1, justifyContent: "start", mt: "14px" }}
        loading={createMutation.isPending}
        loadingPosition="start"
        startIcon={<Add />}
        type="submit"
      >
        Create metadata
      </LoadingButton>
    </Stack>
  );
}

export default ProjectMetadataRowCreate;
