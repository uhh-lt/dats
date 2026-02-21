import {
  Checkbox,
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { docTypeToIcon } from "../../../utils/icons/docTypeToIcon.tsx";
import { Fragment } from "react";

interface DocTypeSelectorMultipleProps {
  multiple: true;
  docTypes: DocType[];
  onDocTypeChange: (docTypes: DocType[]) => void;
  title: string;
}

interface DocTypeSelectorSingleProps {
  multiple?: false;
  docTypes: DocType;
  onDocTypeChange: (docType: DocType) => void;
  title: string;
}

type DocTypeSelectorProps = (DocTypeSelectorMultipleProps | DocTypeSelectorSingleProps) & FormControlProps;

export function DocTypeSelector({ docTypes, onDocTypeChange, title, multiple, ...props }: DocTypeSelectorProps) {
  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<DocType[] | DocType | "">) => {
    if (multiple) {
      (onDocTypeChange as (docTypes: DocType[]) => void)(event.target.value as DocType[]);
    } else {
      (onDocTypeChange as (docType: DocType | "") => void)(event.target.value as DocType | "");
    }
  };

  // render
  return (
    <FormControl {...props}>
      <InputLabel id="doc-type-select-label">{title}</InputLabel>
      <Select
        labelId="doc-type-select-label"
        label={title}
        value={docTypes}
        multiple={multiple}
        onChange={handleChange}
        fullWidth
        renderValue={(selected) => {
          if (multiple) {
            const docTypesArray = selected as DocType[];
            return (
              <Stack direction="row" alignItems="center">
                {docTypesArray.map((docType, index) => (
                  <Fragment key={docType}>
                    {docTypeToIcon[docType]} {docType}
                    {index < docTypesArray.length - 1 && ", "}
                  </Fragment>
                ))}
              </Stack>
            );
          } else {
            const docType = selected as DocType | "";
            if (!docType) return null;
            return (
              <Stack direction="row" alignItems="center">
                {docTypeToIcon[docType]} {docType}
              </Stack>
            );
          }
        }}
      >
        {Object.values(DocType).map((docType) => (
          <MenuItem key={docType} value={docType}>
            {multiple && <Checkbox checked={(docTypes as DocType[]).indexOf(docType) !== -1} />}
            <ListItemText>
              <Stack direction="row" alignItems="center">
                {docTypeToIcon[docType]} {docType}
              </Stack>
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
