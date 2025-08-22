import { PlayCircle } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { ImportJobType } from "../../api/openapi/models/ImportJobType.ts";
import { DialogSection } from "../MUI/DialogSection.tsx";

import { useCallback, useState } from "react";
import ImportHooks from "../../api/ImportHooks.ts";
import ImportDropzone from "./ImportDropzone.tsx";

const importTypeHelperText: Record<ImportJobType, string> = {
  [ImportJobType.PROJECT]: "Import a complete project from a project export file",
  [ImportJobType.TAGS]: "Import document tags from a tags export file",
  [ImportJobType.CODES]: "Import annotation codes from a codes export file",
  [ImportJobType.FOLDERS]: "Import folders from a folders export file",
  [ImportJobType.BBOX_ANNOTATIONS]: "Import bounding box annotations from a bbox export file",
  [ImportJobType.SPAN_ANNOTATIONS]: "Import span annotations from a span export file",
  [ImportJobType.SENTENCE_ANNOTATIONS]: "Import sentence annotations from a sentence export file",
  [ImportJobType.USERS]: "Import users from a users export file",
  [ImportJobType.PROJECT_METADATA]: "Import project metadata from a project metadata export file",
  [ImportJobType.WHITEBOARDS]: "Import whiteboards from a whiteboard export file",
  [ImportJobType.TIMELINE_ANALYSES]: "Import timeline analyses from a timeline analyses export file",
  [ImportJobType.COTA]: "Import Concept Over Time Analyses from a COTA export file",
  [ImportJobType.MEMOS]: "Import memos from a memos export file",
  [ImportJobType.DOCUMENTS]: "Import documents from a documents export file",
};

function ImportSection({ projectId }: { projectId: number }) {
  // State for import type and files
  const [importType, setImportType] = useState<ImportJobType>(ImportJobType.CODES);
  const [file, setFile] = useState<File>();

  const { mutate: startImportMutation, isPending } = ImportHooks.useStartImportJob();

  // Handle import type change
  const handleImportTypeChange = (event: SelectChangeEvent) => {
    setImportType(event.target.value as ImportJobType);
  };

  // Handle file selection
  const handleFilesChange = useCallback((newFile: File) => {
    setFile(newFile);
  }, []);

  // Handle import button click
  const handleImport = useCallback(async () => {
    if (file === undefined) return;

    // Start the import job
    startImportMutation(
      {
        importJobType: importType,
        projectId,
        formData: {
          uploaded_file: file,
        },
      },
      {
        onSuccess() {
          // Reset files after successful import
          setFile(undefined);
        },
      },
    );
  }, [file, importType, projectId, startImportMutation]);

  return (
    <DialogSection title="Import Data">
      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel id="import-type-label">Import Type</InputLabel>
          <Select
            labelId="import-type-label"
            id="import-type"
            value={importType}
            label="Import Type"
            onChange={handleImportTypeChange}
            disabled={isPending}
          >
            {Object.values(ImportJobType).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{importTypeHelperText[importType]}</FormHelperText>
        </FormControl>

        <Typography variant="subtitle2">Select File to Import</Typography>

        {/* Import dropzone component */}
        <ImportDropzone onFileChanged={handleFilesChange} file={file} />

        <LoadingButton
          variant="contained"
          color="primary"
          onClick={handleImport}
          loading={isPending}
          loadingPosition="start"
          startIcon={<PlayCircle />}
          disabled={file === undefined}
          fullWidth
        >
          Import File
        </LoadingButton>
      </Stack>
    </DialogSection>
  );
}

export default ImportSection;
