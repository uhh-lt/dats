import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, Paper, Typography } from "@mui/material";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

// TODO: This list is aligned with doc_type.py but should be consolidated in a shared config file
const allowedMimeTypes: Array<string> = [
  // text
  "text/plain",
  "text/html",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  // images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  // audio
  "audio/mpeg",
  "audio/ogg",
  "audio/wave",
  "audio/webm",
  "audio/x-wav",
  "audio/x-pn-wav",
  "audio/wav",
  "audio/x-hx-aac-adts",
  // video
  "video/mp4",
  "video/webm",
  "video/x-m4v",
  "video/x-msvideo",
  "video/quicktime",
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
        height: "256px",
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
        <CloudUploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
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
