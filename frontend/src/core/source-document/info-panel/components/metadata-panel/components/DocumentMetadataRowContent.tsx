import { ErrorMessage } from "@hookform/error-message";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { Box, Stack } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { MetaType } from "../../../../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataUpdate } from "../../../../../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
import { FormChipList } from "../../../../../../components/FormInputs/FormChipList.tsx";
import { FormDate } from "../../../../../../components/FormInputs/FormDate.tsx";
import { FormNumber } from "../../../../../../components/FormInputs/FormNumber.tsx";
import { FormSwitch } from "../../../../../../components/FormInputs/FormSwitch.tsx";
import { FormText } from "../../../../../../components/FormInputs/FormText.tsx";
import { dateToLocaleYYYYMMDDString } from "../../../../../../utils/DateUtils.ts";
import { isValidHttpUrl } from "../utils.ts";
import { DocumentMetadataGoToButton } from "./DocumentMetadataGoToButton.tsx";
import { MetadataEditMenu } from "./MetadataEditMenu.tsx";

interface DocumentMetadataRowContentProps {
  metadata: SourceDocumentMetadataUpdate;
  projectMetadata: ProjectMetadataRead;
  onAddFilterClick: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
  onUpdateMetadata: (data: SourceDocumentMetadataUpdate) => void;
}

export function DocumentMetadataRowContent({
  metadata,
  projectMetadata,
  onAddFilterClick,
  onUpdateMetadata,
}: DocumentMetadataRowContentProps) {
  // use react hook form
  const {
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

  // form handling
  const handleUpdateMetadata: SubmitHandler<SourceDocumentMetadataUpdate> = useCallback(
    (data) => {
      // only update if data has changed!
      if (
        metadata.str_value !== data.str_value ||
        metadata.int_value !== data.int_value ||
        metadata.date_value !== data.date_value ||
        metadata.boolean_value !== data.boolean_value ||
        metadata.list_value !== data.list_value
      ) {
        onUpdateMetadata({
          str_value: data.str_value,
          int_value: data.int_value,
          date_value: data.date_value ? new Date(data.date_value).toISOString() : data.date_value,
          boolean_value: data.boolean_value,
          list_value: data.list_value,
        });
      }
    },
    [metadata, onUpdateMetadata],
  );

  const handleError: SubmitErrorHandler<SourceDocumentMetadataUpdate> = useCallback((data) => console.error(data), []);

  const handleInputBlur = useCallback(
    () => handleSubmit(handleUpdateMetadata, handleError)(),
    [handleSubmit, handleUpdateMetadata, handleError],
  );

  // Memoize input field based on metadata type
  const inputField = useMemo(() => {
    switch (projectMetadata.metatype) {
      case MetaType.STRING:
        return (
          <FormText
            name="str_value"
            control={control}
            textFieldProps={{
              placeholder: projectMetadata.description,
              error: Boolean(errors.str_value),
              helperText: <ErrorMessage errors={errors} name="str_value" />,
              variant: "standard",
              disabled: projectMetadata.read_only,
              onBlur: handleInputBlur,
              fullWidth: true,
              sx: {
                "& .MuiInput-underline::before": {
                  borderBottom: "1px solid rgba(0, 0, 0, 0)",
                },
              },
            }}
          />
        );
      case MetaType.NUMBER:
        return (
          <FormNumber
            name="int_value"
            control={control}
            textFieldProps={{
              error: Boolean(errors.int_value),
              helperText: <ErrorMessage errors={errors} name="int_value" />,
              variant: "standard",
              disabled: projectMetadata.read_only,
              onBlur: handleInputBlur,
              fullWidth: true,
              sx: {
                "& .MuiInput-underline::before": {
                  borderBottom: "1px solid rgba(0, 0, 0, 0)", // Hide the line by default
                },
              },
            }}
          />
        );
      case MetaType.BOOLEAN:
        return (
          <FormSwitch
            name="boolean_value"
            control={control}
            boxProps={{ sx: { flexGrow: 1, flexBasis: 1 } }}
            switchProps={{ onBlur: handleInputBlur }}
          />
        );
      case MetaType.DATE:
        return (
          <FormDate
            name="date_value"
            control={control}
            textFieldProps={{
              error: Boolean(errors.date_value),
              helperText: <ErrorMessage errors={errors} name="date_value" />,
              variant: "standard",
              disabled: projectMetadata.read_only,
              onBlur: handleInputBlur,
              fullWidth: true,
              sx: {
                "& .MuiInput-underline::before": {
                  borderBottom: "1px solid rgba(0, 0, 0, 0)", // Hide the line by default
                },
              },
            }}
          />
        );
      case MetaType.LIST:
        return (
          <FormChipList
            name="list_value"
            control={control}
            rules={{ required: true }}
            autoCompleteProps={{
              fullWidth: true,
              disabled: projectMetadata.read_only,
            }}
            textFieldProps={{
              fullWidth: true,
              variant: "standard",
              placeholder: projectMetadata.key,
              onBlur: handleInputBlur,
              error: Boolean(errors.list_value),
              helperText: <ErrorMessage errors={errors} name="list_value" />,
              sx: {
                "& .MuiInput-underline::before": {
                  borderBottom: "1px solid rgba(0, 0, 0, 0)", // Hide the line by default
                },
                ...(projectMetadata.read_only ? { "& .MuiInputBase-input": { display: "none" } } : {}),
              },
            }}
          />
        );
    }
  }, [projectMetadata, control, errors, handleInputBlur]);

  return (
    <Stack p={1} sx={{ borderTop: 1, borderColor: "divider" }}>
      <Stack direction="row" alignItems="center">
        <MetadataEditMenu projectMetadata={projectMetadata} />
        <Tooltip title="Add as filter">
          <span>
            <IconButton size="small" onClick={() => onAddFilterClick(metadata, projectMetadata)}>
              <FilterAltIcon />
            </IconButton>
          </span>
        </Tooltip>
        {isLink && <DocumentMetadataGoToButton link={metadata.str_value!} size="small" />}
      </Stack>
      <Box width="100%" px={0.5}>
        {inputField}
      </Box>
    </Stack>
  );
}
