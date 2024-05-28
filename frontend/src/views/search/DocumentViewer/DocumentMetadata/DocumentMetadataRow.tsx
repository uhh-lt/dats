import { ErrorMessage } from "@hookform/error-message";
import { Autocomplete, Box, Chip, Stack, Switch, TextField } from "@mui/material";
import { useCallback } from "react";
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import SdocMetadataHooks from "../../../../api/SdocMetadataHooks.ts";

import { MetaType } from "../../../../api/openapi/models/MetaType.ts";
import { SourceDocumentMetadataRead } from "../../../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { SourceDocumentMetadataReadResolved } from "../../../../api/openapi/models/SourceDocumentMetadataReadResolved.ts";
import { SourceDocumentMetadataUpdate } from "../../../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI.ts";
import { dateToLocaleYYYYMMDDString } from "../../../../utils/DateUtils.ts";
import DocumentMetadataAddFilterButton from "./DocumentMetadataAddFilterButton.tsx";
import DocumentMetadataGoToButton from "./DocumentMetadataGoToButton.tsx";
import { isValidHttpUrl } from "./utils.ts";

interface DocumentMetadataRowProps {
  metadata: SourceDocumentMetadataReadResolved;
  filterName?: string;
}

function DocumentMetadataRow({ metadata, filterName }: DocumentMetadataRowProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<SourceDocumentMetadataUpdate>({
    values: {
      str_value: metadata.str_value,
      int_value: metadata.int_value,
      date_value: metadata.date_value ? dateToLocaleYYYYMMDDString(metadata.date_value) : metadata.date_value,
      boolean_value: metadata.boolean_value,
      list_value: metadata.list_value,
    },
  });

  // computed
  const isLink = metadata.str_value ? isValidHttpUrl(metadata.str_value) : false;

  // mutation
  const updateMutation = SdocMetadataHooks.useUpdateMetadata();

  // form handling
  const handleUpdateMetadata: SubmitHandler<SourceDocumentMetadataUpdate> = useCallback(
    (data) => {
      // // only update if data has changed!
      if (
        metadata.str_value !== data.str_value ||
        metadata.int_value !== data.int_value ||
        metadata.date_value !== data.date_value ||
        metadata.boolean_value !== data.boolean_value ||
        metadata.list_value !== data.list_value
      ) {
        const mutation = updateMutation.mutate;
        mutation(
          {
            metadataId: metadata.id,
            requestBody: {
              str_value: data.str_value,
              int_value: data.int_value,
              date_value: data.date_value ? new Date(data.date_value).toISOString() : data.date_value,
              boolean_value: data.boolean_value,
              list_value: data.list_value,
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
    [metadata, updateMutation.mutate],
  );
  const handleError: SubmitErrorHandler<SourceDocumentMetadataUpdate> = useCallback((data) => console.error(data), []);

  let inputField: JSX.Element;
  switch (metadata.project_metadata.metatype) {
    case MetaType.STRING:
      inputField = (
        <TextField
          {...register("str_value", { required: "Value is required" })}
          error={Boolean(errors.str_value)}
          helperText={<ErrorMessage errors={errors} name="str_value" />}
          variant="standard"
          disabled={metadata.project_metadata.read_only}
          onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
          sx={{
            flexGrow: 1,
            flexBasis: 1,
          }}
        />
      );
      break;
    case MetaType.NUMBER:
      inputField = (
        <TextField
          {...register("int_value", { required: "Value is required" })}
          error={Boolean(errors.int_value)}
          helperText={<ErrorMessage errors={errors} name="int_value" />}
          variant="standard"
          type="number"
          disabled={metadata.project_metadata.read_only}
          onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
          sx={{
            flexGrow: 1,
            flexBasis: 1,
          }}
        />
      );
      break;
    case MetaType.BOOLEAN:
      inputField = (
        <Controller
          name="boolean_value"
          render={({ field }) => (
            <Box
              sx={{
                flexGrow: 1,
                flexBasis: 1,
              }}
            >
              <Switch
                {...field}
                checked={field.value === null ? false : field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
              />
            </Box>
          )}
          control={control}
        />
      );
      break;
    case MetaType.DATE:
      inputField = (
        <TextField
          {...register("date_value", { required: "Value is required" })}
          error={Boolean(errors.date_value)}
          helperText={<ErrorMessage errors={errors} name="date_value" />}
          variant="standard"
          type="date"
          disabled={metadata.project_metadata.read_only}
          onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
          sx={{
            flexGrow: 1,
            flexBasis: 1,
          }}
        />
      );
      break;
    case MetaType.LIST:
      inputField = (
        <Controller
          name="list_value"
          rules={{ required: true }}
          render={({ field }) => {
            return (
              <Autocomplete
                value={field.value ? [...field.value] : []}
                onChange={(_event, newValue) => {
                  field.onChange(newValue);
                }}
                disabled={metadata.project_metadata.read_only}
                sx={{
                  flexGrow: 1,
                  flexBasis: 1,
                }}
                multiple
                options={[]}
                freeSolo
                disableClearable
                renderTags={(value: readonly string[], getTagProps) =>
                  value.map((option: string, index: number) => (
                    <Chip
                      style={{ borderRadius: "4px", height: "100%" }}
                      variant="filled"
                      label={option}
                      {...getTagProps({ index })}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    variant="standard"
                    placeholder={metadata.project_metadata.key}
                    onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
                    helperText={<></>}
                  />
                )}
              />
            );
          }}
          control={control}
        />
      );
      break;
  }

  return (
    <Stack direction="row" alignItems="flex-end" mt={1}>
      <TextField
        variant="standard"
        error={false}
        helperText={<></>}
        disabled
        defaultValue={metadata.project_metadata.key}
        sx={{ flexGrow: 1, flexBasis: 1 }}
        inputProps={{ style: { textAlign: "right", paddingRight: "8px" } }}
      />
      {inputField}
      {isLink && <DocumentMetadataGoToButton link={metadata.str_value!} size="small" />}
      {filterName && <DocumentMetadataAddFilterButton metadata={metadata} filterName={filterName} size="small" />}
    </Stack>
  );
}

export default DocumentMetadataRow;
