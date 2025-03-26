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
import React from "react";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { docTypeToIcon } from "../../../utils/icons/docTypeToIcon.tsx";

interface DocTypeSelectorMultiProps {
  docTypes: DocType[];
  onDocTypeChange: (docTypes: DocType[]) => void;
  title: string;
}

function DocTypeSelectorMulti({
  docTypes,
  onDocTypeChange,
  title,
  ...props
}: DocTypeSelectorMultiProps & FormControlProps) {
  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<DocType[]>) => {
    onDocTypeChange(event.target.value as DocType[]);
  };

  // render
  return (
    <FormControl {...props}>
      <InputLabel id="doc-type-select-label">{title}</InputLabel>
      <Select
        labelId="doc-type-select-label"
        label={title}
        value={docTypes}
        multiple
        onChange={handleChange}
        fullWidth
        renderValue={(docTypes) => (
          <Stack direction="row" alignItems="center">
            {docTypes.map((docType, index) => (
              <React.Fragment key={docType}>
                {docTypeToIcon[docType]} {docType}
                {index < docTypes.length - 1 && ", "}
              </React.Fragment>
            ))}
          </Stack>
        )}
      >
        {Object.values(DocType).map((docType) => (
          <MenuItem key={docType} value={docType}>
            <Checkbox checked={docTypes.indexOf(docType) !== -1} />
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

export default DocTypeSelectorMulti;
