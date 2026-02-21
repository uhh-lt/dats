import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, Paper, Typography } from "@mui/material";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

// Define both MIME types and file extensions
const allowedFileTypes = {
  "application/zip": [".zip"],
  "application/x-zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "application/x-compress": [".zip"],
  "application/x-compressed": [".zip"],
  "application/octet-stream": [".zip"],
  "multipart/x-zip": [".zip"],
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".csv"],
};

// File extensions for display purposes
const allowedFileExtensions = Array.from(new Set(Object.values(allowedFileTypes).flat()));

interface ImportDropzoneProps {
  onFileChanged: (file: File) => void;
  file?: File;
}

export function ImportDropzone({ onFileChanged, file }: ImportDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Only take the first file if multiple are dropped
      if (acceptedFiles.length > 0) {
        onFileChanged(acceptedFiles[0]);
      }
    },
    [onFileChanged],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedFileTypes,
    maxSize: 100 * 1024 * 1024, // 100MB max file size
    multiple: false, // Only allow single file selection
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
        transition: "background-color 0.3s ease",
        "&:hover": {
          backgroundColor: "action.hover",
        },
      }}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <Box textAlign="center">
        <CloudUploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
        {isDragActive ? (
          <Typography>Drop the file here...</Typography>
        ) : (
          <>
            <Typography>Drag & drop a file here, or click to select</Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
              Accepted formats: {allowedFileExtensions.join(", ")}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
              Maximum file size: 100MB
            </Typography>
            {file && (
              <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: "bold" }}>
                Selected: {file.name}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
}
