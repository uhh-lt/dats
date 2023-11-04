import { ErrorMessage } from "@hookform/error-message";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Grid, Stack, TextField } from "@mui/material";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import ProjectMetadataHooks from "../../../../api/ProjectMetadataHooks";
import SdocMetadataHooks from "../../../../api/SdocMetadataHooks";
import { ProjectMetadataRead, SourceDocumentMetadataRead, SourceDocumentMetadataUpdate } from "../../../../api/openapi";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";
import DocumentMetadataAddFilterButton from "./DocumentMetadataAddFilterButton";
import DocumentMetadataGoToButton from "./DocumentMetadataGoToButton";
import { isValidHttpUrl } from "./utils";

interface DocumentMetadataRowProps {
  metadata: SourceDocumentMetadataRead;
}

function DocumentMetadataRow({ metadata }: DocumentMetadataRowProps) {
  // global server state
  const projectMetadata = ProjectMetadataHooks.useGetMetadata(metadata.project_metadata_id);

  if (projectMetadata.isSuccess) {
    return <DocumentMetadataRowWithData metadata={metadata} projectMetadata={projectMetadata.data} />;
  } else if (projectMetadata.isLoading) {
    return <>Loading...</>;
  } else if (projectMetadata.isError) {
    return <>{projectMetadata.error.message}</>;
  } else {
    return <>Error?</>;
  }
}

function DocumentMetadataRowWithData({
  metadata,
  projectMetadata,
}: {
  metadata: SourceDocumentMetadataRead;
  projectMetadata: ProjectMetadataRead;
}) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SourceDocumentMetadataUpdate>();

  // computed
  const isLink = isValidHttpUrl(metadata.value);

  // effects
  // initialize form when metadata changes
  useEffect(() => {
    reset({
      value: metadata.value,
    });
  }, [metadata, reset]);

  // mutation
  const updateMutation = SdocMetadataHooks.useUpdateMetadata();

  // form handling
  const handleUpdateMetadata: SubmitHandler<SourceDocumentMetadataUpdate> = useCallback(
    (data: any) => {
      // only update if data has changed!
      if (metadata.value !== data.value) {
        const mutation = updateMutation.mutate;
        mutation(
          {
            metadataId: metadata.id,
            requestBody: {
              value: data.value,
            },
          },
          {
            onSuccess: (metadata: SourceDocumentMetadataRead) => {
              SnackbarAPI.openSnackbar({
                text: `Updated metadata ${metadata.id} for document ${metadata.source_document_id}`,
                severity: "success",
              });
            },
          },
        );
      }
    },
    [metadata.value, metadata.id, updateMutation.mutate],
  );
  const handleError: SubmitErrorHandler<SourceDocumentMetadataUpdate> = useCallback((data) => console.error(data), []);

  return (
    <Stack direction="row" alignItems="flex-start" mt={1}>
      <InfoOutlinedIcon fontSize="medium" sx={{ my: "5px", mr: 1 }} />
      <TextField variant="standard" disabled defaultValue={projectMetadata.key} sx={{ flexGrow: 1, flexBasis: 1 }} />
      <TextField
        {...register("value", { required: "Value is required" })}
        error={Boolean(errors.value)}
        helperText={<ErrorMessage errors={errors} name="value" />}
        variant="standard"
        disabled={projectMetadata.read_only}
        onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
        sx={{ flexGrow: 1, flexBasis: 1 }}
      />
      {isLink && <DocumentMetadataGoToButton link={metadata.value} size="small" />}
      <DocumentMetadataAddFilterButton metadata={metadata} projectMetadata={projectMetadata} size="small" />
    </Stack>
  );
}

export default DocumentMetadataRow;
