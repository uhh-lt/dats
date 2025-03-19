import PlayCircle from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import ProjectHooks from "../../api/ProjectHooks";
import { UploadDropzone } from "./UploadDropzone";

interface FileUploadSectionProps {
  projectId: number;
}

export function FileUploadSection({ projectId }: FileUploadSectionProps) {
  // Upload mutation
  const uploadDocumentMutation = ProjectHooks.useUploadDocument();

  // Local state for selected files
  const [files, setFiles] = useState<File[]>([]);

  const handleFilesChange = useCallback((files: File[]) => {
    setFiles(files);
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length > 0) {
      await uploadDocumentMutation.mutateAsync({
        projId: projectId,
        formData: {
          uploaded_files: Array.from(files),
        },
      });
      setFiles([]);
    }
  }, [files, projectId, uploadDocumentMutation]);

  return (
    <Box flex={1} border={1} borderColor="divider" borderRadius={1} p={2}>
      <Typography variant="h6" gutterBottom>
        Upload Files
      </Typography>
      <UploadDropzone onFilesChanged={handleFilesChange} files={files} />
      <LoadingButton
        variant="contained"
        color="primary"
        onClick={handleUpload}
        loading={uploadDocumentMutation.isPending}
        loadingPosition="start"
        startIcon={<PlayCircle />}
        disabled={files.length === 0}
        fullWidth
        sx={{ mt: 2 }}
      >
        Upload {files.length} File{files.length !== 1 ? "s" : ""}
      </LoadingButton>
    </Box>
  );
}
