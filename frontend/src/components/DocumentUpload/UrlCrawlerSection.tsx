import AddIcon from "@mui/icons-material/Add";
import PlayCircle from "@mui/icons-material/PlayCircle";
import RemoveIcon from "@mui/icons-material/Remove";
import { LoadingButton } from "@mui/lab";
import { IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import CrawlerHooks from "../../api/CrawlerHooks";
import { DialogSection } from "../MUI/DialogSection";

interface UrlCrawlerSectionProps {
  projectId: number;
}

function isValidHttpUrl(string: string): boolean {
  if (!string.trim()) return false;

  let url;
  try {
    url = new URL(string);
  } catch {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export function UrlCrawlerSection({ projectId }: UrlCrawlerSectionProps) {
  // Crawler mutation
  const crawlUrlsMutation = CrawlerHooks.useStartCrawlerJob();

  // Local state
  const [currentUrl, setCurrentUrl] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentUrl(event.target.value);
    setError(null);
  }, []);

  const handleAddUrl = useCallback(() => {
    const trimmedUrl = currentUrl.trim();
    if (isValidHttpUrl(trimmedUrl)) {
      if (urls.includes(trimmedUrl)) {
        setError("This URL has already been added to the list");
        return;
      }
      setUrls((prev) => [...prev, trimmedUrl]);
      setCurrentUrl("");
      setError(null);
    } else {
      setError("Please enter a valid URL (must start with http:// or https://)");
    }
  }, [currentUrl, urls]);

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddUrl();
      }
    },
    [handleAddUrl],
  );

  const handleRemoveUrl = useCallback((indexToRemove: number) => {
    setUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleImport = useCallback(async () => {
    if (urls.length > 0) {
      await crawlUrlsMutation.mutateAsync({
        requestBody: {
          project_id: projectId,
          urls: urls,
        },
      });
      setUrls([]);
    }
  }, [urls, projectId, crawlUrlsMutation]);

  return (
    <DialogSection title="Upload URLs">
      {/* URL Input Field */}
      <Stack direction="row" spacing={1} mb={2}>
        <TextField
          size="small"
          fullWidth
          placeholder="Enter URL (must start with http:// or https://)"
          value={currentUrl}
          onChange={handleUrlChange}
          onKeyPress={handleKeyPress}
          error={Boolean(error)}
          helperText={error}
        />
        <IconButton onClick={handleAddUrl} color="primary" disabled={!isValidHttpUrl(currentUrl)}>
          <AddIcon />
        </IconButton>
      </Stack>

      {/* URL List */}
      <Paper
        variant="outlined"
        sx={{
          height: "200px",
          p: 2,
          mb: 2,
          overflow: "auto",
        }}
      >
        <Stack spacing={1}>
          {urls.map((url, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="center">
              <Typography noWrap sx={{ flex: 1 }}>
                {url}
              </Typography>
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
      </Paper>

      {/* Import Button */}
      <LoadingButton
        variant="contained"
        color="primary"
        onClick={handleImport}
        loading={crawlUrlsMutation.isPending}
        loadingPosition="start"
        startIcon={<PlayCircle />}
        disabled={urls.length === 0}
        fullWidth
      >
        Import {urls.length} URL{urls.length !== 1 ? "s" : ""}
      </LoadingButton>
    </DialogSection>
  );
}
