import { SourceDocumentMetadataRead } from "../../../../api/openapi";
import { useForm } from "react-hook-form";
import React, { useCallback, useEffect } from "react";
import MetadataHooks from "../../../../api/MetadataHooks";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { Grid, Stack, TextField } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { ErrorMessage } from "@hookform/error-message";
import DocumentMetadataDeleteButton from "./DocumentMetadataDeleteButton";
import DocumentMetadataAddFilterButton from "./DocumentMetadataAddFilterButton";

interface DocumentMetadataRowProps {
  metadata: SourceDocumentMetadataRead;
}

function DocumentMetadataRow({ metadata }: DocumentMetadataRowProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // initialize form when metadata changes
  useEffect(() => {
    reset({
      key: metadata.key,
      value: metadata.value,
    });
  }, [metadata, reset]);

  // mutation
  const updateMutation = MetadataHooks.useUpdateMetadata();

  // form handling
  const handleUpdateMetadata = useCallback(
    (data: any) => {
      // only update if data has changed!
      if (metadata.key !== data.key || metadata.value !== data.value) {
        updateMutation.mutate(
          {
            metadataId: metadata.id,
            requestBody: {
              key: data.key,
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
          }
        );
      }
    },
    [metadata.key, metadata.value, metadata.id, updateMutation]
  );
  const handleError = useCallback((data: any) => console.error(data), []);

  return (
    <>
      <Grid item md={2}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <InfoOutlinedIcon fontSize="medium" sx={{ mr: 1 }} />
          <TextField
            {...register("key", { required: "Key is required" })}
            error={Boolean(errors.key)}
            helperText={<ErrorMessage errors={errors} name="key" />}
            fullWidth
            size="small"
            variant="standard"
            disabled={metadata.read_only}
            onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
          />
        </Stack>
      </Grid>
      <Grid item md={10}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <TextField
            {...register("value", { required: "Value is required" })}
            error={Boolean(errors.value)}
            helperText={<ErrorMessage errors={errors} name="value" />}
            fullWidth
            size="small"
            variant="standard"
            disabled={metadata.read_only}
            onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
          />
          <DocumentMetadataAddFilterButton metadata={metadata} />
          <DocumentMetadataDeleteButton metadataId={metadata.id} size="small" disabled={metadata.read_only} />
        </Stack>
      </Grid>
    </>
  );
}

export default DocumentMetadataRow;
