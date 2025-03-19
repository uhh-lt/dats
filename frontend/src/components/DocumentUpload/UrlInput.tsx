import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { useCallback } from "react";

function isValidHttpUrl(string: string): boolean {
  let url;
  try {
    url = new URL(string);
  } catch (e) {
    console.error(e);
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

interface UrlInputProps {
  onUrlsChanged: (urls: string[]) => void;
  urls: string[];
}

export function UrlInput({ onUrlsChanged, urls }: UrlInputProps) {
  const handleUrlChange = useCallback(
    (index: number, value: string) => {
      const newUrls = [...urls];
      newUrls[index] = value;
      onUrlsChanged(
        newUrls.filter((url) => {
          const trimmed = url.trim();
          return trimmed !== "" && isValidHttpUrl(trimmed);
        }),
      );
    },
    [urls, onUrlsChanged],
  );

  const handleAddUrl = useCallback(() => {
    onUrlsChanged([...urls, ""]);
  }, [urls, onUrlsChanged]);

  const handleRemoveUrl = useCallback(
    (index: number) => {
      onUrlsChanged(urls.filter((_, i) => i !== index));
    },
    [urls, onUrlsChanged],
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "200px",
        p: 2,
        overflow: "auto",
      }}
    >
      <Stack spacing={1}>
        {urls.map((url, index) => (
          <Stack key={index} direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              fullWidth
              placeholder="Enter URL (must start with http:// or https://)"
              value={url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              error={url.trim() !== "" && !isValidHttpUrl(url.trim())}
              helperText={url.trim() !== "" && !isValidHttpUrl(url.trim()) ? "Invalid URL format" : ""}
            />
            <IconButton size="small" onClick={() => handleRemoveUrl(index)} color="error">
              <RemoveIcon />
            </IconButton>
          </Stack>
        ))}
        {urls.length === 0 && (
          <Typography color="textSecondary" textAlign="center">
            No URLs added yet
          </Typography>
        )}
      </Stack>
      {urls.length < 10 && (
        <Box textAlign="center" mt={2}>
          <IconButton onClick={handleAddUrl} color="primary">
            <AddIcon />
          </IconButton>
        </Box>
      )}
    </Paper>
  );
}
