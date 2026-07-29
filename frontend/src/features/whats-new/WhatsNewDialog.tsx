import { OpenAPI } from "@api/core/OpenAPI";
import { QueryKey } from "@api/hooks/QueryKey";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import LaunchIcon from "@mui/icons-material/Launch";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getGitHubRelease, getGitHubReleasePageUrl } from "./_api/githubRelease";

const DISMISSED_VERSION_KEY = "dats-whats-new-dismissed-version";
const currentVersion = OpenAPI.VERSION;
const currentReleaseTag = currentVersion.startsWith("v") ? currentVersion : `v${currentVersion}`;
const releasePageUrl = getGitHubReleasePageUrl(currentReleaseTag);

function readDismissedVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
}

function storeDismissedVersion(): void {
  try {
    localStorage.setItem(DISMISSED_VERSION_KEY, currentVersion);
  } catch {
    // Dismissing the currently open dialog still works when storage is unavailable.
  }
}

export function WhatsNewDialog() {
  const [isOpen, setIsOpen] = useState(() => readDismissedVersion() !== currentVersion);
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const releaseQuery = useQuery({
    queryKey: [QueryKey.GITHUB_RELEASE, currentReleaseTag],
    queryFn: () => getGitHubRelease(currentReleaseTag),
    enabled: isOpen,
    retry: 1,
    staleTime: Infinity,
  });

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleDoNotShowAgain = useCallback(() => {
    storeDismissedVersion();
    setIsOpen(false);
  }, []);

  const { refetch } = releaseQuery;
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      aria-label={`What's new in DATS v${currentVersion}`}
    >
      <DATSDialogHeader
        title={`🚀 What's new in DATS v${currentVersion}`}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent dividers sx={{ minHeight: 240 }}>
        {releaseQuery.isPending && (
          <Stack alignItems="center" justifyContent="center" minHeight={200} spacing={2}>
            <CircularProgress />
            <Typography color="text.secondary">Loading release notes…</Typography>
          </Stack>
        )}

        {releaseQuery.isError && (
          <Stack spacing={2}>
            <Alert severity="warning">
              The release notes could not be loaded from GitHub. You can retry or view the release directly on GitHub.
            </Alert>
            <Box>
              <Button onClick={handleRetry} variant="outlined">
                Retry
              </Button>
            </Box>
          </Stack>
        )}

        {releaseQuery.isSuccess && releaseQuery.data.body && (
          <Box
            className="markdown-content"
            sx={{
              overflowWrap: "anywhere",
              "& > :first-of-type": { mt: 0 },
              "& > :last-child": { mb: 0 },
              "& pre": { overflowX: "auto" },
              "& img": { maxWidth: "100%" },
            }}
          >
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ children, href }) => (
                  <Link href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </Link>
                ),
              }}
            >
              {releaseQuery.data.body}
            </Markdown>
          </Box>
        )}

        {releaseQuery.isSuccess && !releaseQuery.data.body && (
          <Alert severity="info">No release notes have been published for this version yet.</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, flexWrap: "wrap", gap: 1 }}>
        <Button
          component="a"
          href={releasePageUrl}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<LaunchIcon />}
        >
          View on GitHub
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={handleDoNotShowAgain}>Do not show again</Button>
        <Button onClick={handleClose} variant="contained">
          Sounds great!
        </Button>
      </DialogActions>
    </Dialog>
  );
}
