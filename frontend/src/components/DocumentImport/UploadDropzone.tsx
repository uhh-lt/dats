import { Box, Paper, Typography } from "@mui/material";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

// allowed mime types from the old component
const allowedMimeTypes: Array<string> = [
  "text/plain",
  "text/html",
  "image/jpeg",
  "image/png",
  "audio/mpeg",
  "audio/ogg",
  "audio/wave",
  "audio/webm",
  "audio/x-wav",
  "audio/x-pn-wav",
  "audio/wav",
  "video/mp4",
  "video/webm",
  "video/x-m4v",
  "video/x-msvideo",
  "video/quicktime",
  "application/zip",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface UploadDropzoneProps {
  onFilesChanged: (files: File[]) => void;
  files: File[];
}

export function UploadDropzone({ onFilesChanged, files }: UploadDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesChanged(acceptedFiles);
    },
    [onFilesChanged],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: 100 * 1024 * 1024, // 100MB max file size
  });

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "200px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        backgroundColor: isDragActive ? "action.hover" : "background.paper",
        cursor: "pointer",
      }}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <Box textAlign="center">
        {isDragActive ? (
          <Typography>Drop the files here...</Typography>
        ) : (
          <>
            <Typography>Drag & drop files here, or click to select files</Typography>
            <Typography variant="caption" color="textSecondary">
              Maximum file size: 100MB
            </Typography>
            {files.length > 0 && (
              <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </Typography>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
}
