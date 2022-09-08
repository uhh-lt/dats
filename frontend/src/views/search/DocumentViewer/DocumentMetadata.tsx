import React, { useCallback, useEffect, useMemo } from "react";
import { SourceDocumentMetadataRead } from "../../../api/openapi";
import { Box, Grid, IconButtonProps, Stack, TextField } from "@mui/material";
import { Add } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import MetadataHooks from "../../../api/MetadataHooks";
import { useQueryClient, UseQueryResult } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../../api/QueryKey";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import { useForm } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface AddDocumentMetadataButtonProps {
  sdocId: number;
}

function AddDocumentMetadataButton({ sdocId }: AddDocumentMetadataButtonProps) {
  // mutations
  const queryClient = useQueryClient();
  const createMutation = MetadataHooks.useCreateMetadata({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data: SourceDocumentMetadataRead) => {
      queryClient.invalidateQueries([QueryKey.METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
      SnackbarAPI.openSnackbar({
        text: `Added metadata to SourceDocument ${data.source_document_id}`,
        severity: "success",
      });
    },
  });

  const handleAddMetadata = useCallback(() => {
    createMutation.mutate({
      requestBody: {
        source_document_id: sdocId,
        read_only: false,
        key: "Key",
        value: "Value",
      },
    });
  }, [createMutation, sdocId]);

  return (
    <Grid item md={2}>
      <LoadingButton
        sx={{ px: 1, justifyContent: "start" }}
        loading={createMutation.isLoading}
        loadingPosition="start"
        startIcon={<Add />}
        variant="outlined"
        fullWidth
        onClick={handleAddMetadata}
      >
        Add
      </LoadingButton>
    </Grid>
  );
}

interface DeleteDocumentMetadataButtonProps {
  metadataId: number;
}

function DeleteDocumentMetadataButton({ metadataId, ...props }: DeleteDocumentMetadataButtonProps & IconButtonProps) {
  // mutations
  const queryClient = useQueryClient();
  const deleteMutation = MetadataHooks.useDeleteMetadata({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data: SourceDocumentMetadataRead) => {
      queryClient.invalidateQueries([QueryKey.METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted Metadata ${data.id} from SourceDocument ${data.source_document_id}`,
        severity: "success",
      });
    },
  });

  const handleDeleteMetadata = useCallback(() => {
    deleteMutation.mutate({
      metadataId: metadataId,
    });
  }, [deleteMutation, metadataId]);

  return (
    <Tooltip title="Delete">
      <span>
        <IconButton {...props} onClick={handleDeleteMetadata} disabled={deleteMutation.isLoading || props.disabled}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

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
  const queryClient = useQueryClient();
  const updateMutation = MetadataHooks.useUpdateMetadata({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (metadata: SourceDocumentMetadataRead) => {
      queryClient.invalidateQueries([QueryKey.METADATA, metadata.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, metadata.source_document_id]);
      SnackbarAPI.openSnackbar({
        text: `Updated metadata ${metadata.id} for document ${metadata.source_document_id}`,
        severity: "success",
      });
    },
  });

  // form handling
  const handleUpdateMetadata = useCallback(
    (data: any) => {
      // only update if data has changed!
      if (metadata.key !== data.key || metadata.value !== data.value) {
        updateMutation.mutate({
          metadataId: metadata.id,
          requestBody: {
            key: data.key,
            value: data.value,
          },
        });
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
          <DeleteDocumentMetadataButton metadataId={metadata.id} size="small" disabled={metadata.read_only} />
        </Stack>
      </Grid>
    </>
  );
}

interface DocumentMetadataProps {
  sdocId: number | undefined;
  metadata: UseQueryResult<Map<string, SourceDocumentMetadataRead>, Error>;
}

function DocumentMetadata({ sdocId, metadata }: DocumentMetadataProps) {
  // computed
  const filteredMetadata = useMemo(() => {
    if (metadata.data) {
      const metadatas = Array.from(metadata.data.values());
      return metadatas.filter((x) => x.key !== "word_frequencies");
    }
    return [];
  }, [metadata.data]);

  return (
    <Box>
      {metadata.isLoading && <h1>Loading...</h1>}
      {metadata.isError && <h1>{metadata.error.message}</h1>}
      {metadata.isSuccess && (
        <Grid container rowSpacing={2} columnSpacing={1}>
          {filteredMetadata.map((data) => (
            <DocumentMetadataRow key={data.id} metadata={data} />
          ))}
          <AddDocumentMetadataButton sdocId={sdocId!} />
        </Grid>
      )}
    </Box>
  );
}

export default DocumentMetadata;
