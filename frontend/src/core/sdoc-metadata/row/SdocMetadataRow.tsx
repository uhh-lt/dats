import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { FormChipList, FormDate, FormNumber, FormSwitch, FormText } from "@components/form-inputs";
import { ProjectMetadataEditMenu } from "@core/project-metadata";
import { ErrorMessage } from "@hookform/error-message";
import { MetaType } from "@models/MetaType";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { Box, Stack } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { dateToLocaleYYYYMMDDString } from "@utils/DateUtils";
import { isValidHttpUrl } from "@utils/URLUtils";
import { memo, useCallback, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { SdocMetadataGoToButton } from "./_components/SdocMetadataGoToButton";

interface SdocMetadataRowProps {
  metadata: Omit<SourceDocumentMetadataRead, "id" | "source_document_id">;
  onUpdateMetadata: (data: SourceDocumentMetadataUpdate) => void;
  onAddFilterClick?: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
}

export const SdocMetadataRow = memo(({ metadata, onUpdateMetadata, onAddFilterClick }: SdocMetadataRowProps) => {
  const projectMetadata = MetadataHooks.useGetProjectMetadata(metadata.project_metadata_id);

  if (projectMetadata.data) {
    return (
      <SdocMetadataRowContent
        metadata={metadata}
        projectMetadata={projectMetadata.data}
        onAddFilterClick={onAddFilterClick}
        onUpdateMetadata={onUpdateMetadata}
      />
    );
  }
  return null;
});

interface SdocMetadataRowContentProps {
  metadata: SourceDocumentMetadataUpdate;
  projectMetadata: ProjectMetadataRead;
  onAddFilterClick?: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
  onUpdateMetadata: (data: SourceDocumentMetadataUpdate) => void;
}

function SdocMetadataRowContent({
  metadata,
  projectMetadata,
  onAddFilterClick,
  onUpdateMetadata,
}: SdocMetadataRowContentProps) {
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
        <ProjectMetadataEditMenu projectMetadata={projectMetadata} />
        {onAddFilterClick && (
          <Tooltip title="Add as filter">
            <span>
              <IconButton size="small" onClick={() => onAddFilterClick(metadata, projectMetadata)}>
                <FilterAltIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {isLink && <SdocMetadataGoToButton link={metadata.str_value!} size="small" />}
      </Stack>
      <Box width="100%" px={0.5}>
        {inputField}
      </Box>
    </Stack>
  );
}
