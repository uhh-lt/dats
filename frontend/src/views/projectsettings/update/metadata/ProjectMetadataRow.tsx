import { ErrorMessage } from "@hookform/error-message";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { MenuItem, Stack, TextField } from "@mui/material";
import { useCallback } from "react";
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import ProjectMetadataHooks from "../../../../api/ProjectMetadataHooks.ts";
import { MetaType } from "../../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../../../api/openapi/models/ProjectMetadataRead.ts";
import { ProjectMetadataUpdate } from "../../../../api/openapi/models/ProjectMetadataUpdate.ts";
import ConfirmationAPI from "../../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import ProjectMetadataDeleteButton from "./ProjectMetadataDeleteButton.tsx";

export function ProjectMetadataRow({ projectMetadataId }: { projectMetadataId: number }) {
  // global server state
  const projectMetadata = ProjectMetadataHooks.useGetMetadata(projectMetadataId);

  if (projectMetadata.isSuccess) {
    return <ProjectMetadataRowWithData projectMetadata={projectMetadata.data} />;
  } else if (projectMetadata.isLoading) {
    return <>Loading...</>;
  } else if (projectMetadata.isError) {
    return <>{projectMetadata.error.message}</>;
  } else {
    return <>Error?</>;
  }
}
function ProjectMetadataRowWithData({ projectMetadata }: { projectMetadata: ProjectMetadataRead }) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    resetField,
    control,
  } = useForm<ProjectMetadataUpdate>({
    values: {
      key: projectMetadata.key,
      metatype: projectMetadata.metatype,
    },
  });

  // form handling
  const updateMutation = ProjectMetadataHooks.useUpdateMetadata();
  const handleUpdateMetadata: SubmitHandler<ProjectMetadataUpdate> = useCallback(
    (data) => {
      // only update if data has changed!
      if (projectMetadata.metatype !== data.metatype || projectMetadata.key !== data.key) {
        const mutation = updateMutation.mutate;
        const actuallyMutate = () =>
          mutation({
            metadataId: projectMetadata.id,
            requestBody: {
              metatype: data.metatype,
              key: data.key,
            },
          });
        if (projectMetadata.metatype !== data.metatype) {
          ConfirmationAPI.openConfirmationDialog({
            text: "Changing the type of this metadata will remove its existing entries. This action cannot be undone. Do you want to proceed?",
            onAccept: actuallyMutate,
            onReject() {
              console.log("rej");
              resetField("metatype");
            },
          });
        } else {
          actuallyMutate();
        }
      }
    },
    [projectMetadata.id, projectMetadata.key, projectMetadata.metatype, updateMutation.mutate, resetField],
  );
  const handleError: SubmitErrorHandler<ProjectMetadataUpdate> = useCallback((data) => console.error(data), []);

  return (
    <Stack direction="row" alignItems="flex-start" mt={1}>
      <InfoOutlinedIcon fontSize="medium" sx={{ my: "5px", mr: 1 }} />
      <TextField
        {...register("key", { required: "Key is required" })}
        error={Boolean(errors.key)}
        helperText={<ErrorMessage errors={errors} name="key" />}
        variant="standard"
        disabled={projectMetadata.read_only}
        onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
        sx={{ flexGrow: 1, flexBasis: 1 }}
      />
      <Controller
        name="metatype"
        control={control}
        rules={{
          required: "Value is required",
        }}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            error={Boolean(errors.metatype)}
            helperText={<ErrorMessage errors={errors} name="metatype" />}
            select
            variant="standard"
            defaultValue={projectMetadata.metatype}
            disabled={projectMetadata.read_only}
            onChange={onChange}
            onBlur={() => {
              onBlur();
              handleSubmit(handleUpdateMetadata, handleError)();
            }}
            value={value}
            sx={{ flexGrow: 1, flexBasis: 1 }}
          >
            {Object.values(MetaType).map((metaType) => (
              <MenuItem key={metaType} value={metaType}>
                {metaType}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <ProjectMetadataDeleteButton metadataId={projectMetadata.id} disabled={projectMetadata.read_only} />
    </Stack>
  );
}
