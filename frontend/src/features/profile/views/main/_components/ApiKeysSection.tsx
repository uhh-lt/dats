import { ApiKeyService } from "@api/services/ApiKeyService";
import { useOpenSnackbar } from "@core/notification";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { ApiKeyCreateDialog } from "./ApiKeyCreateDialog";
import { ApiKeyTable } from "./ApiKeyTable";

export function ApiKeysSection() {
  // local client state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // actions
  const handleOpenCreateDialog = useCallback(() => setIsCreateDialogOpen(true), []);
  const handleCloseCreateDialog = useCallback(() => setIsCreateDialogOpen(false), []);

  const handleCopyMcpConfig = useCallback(() => {
    ApiKeyService.getMcpConfig()
      .then((config) =>
        navigator.clipboard
          .writeText(JSON.stringify(config, null, 2))
          .then(() => openSnackbar({ text: "Copied MCP config to clipboard", severity: "success" })),
      )
      .catch(() => openSnackbar({ text: "Failed to copy MCP config", severity: "error" }));
  }, [openSnackbar]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography variant="h5" sx={{ pb: 1 }}>
        API Keys
      </Typography>
      <Divider />
      <Box sx={{ pt: 3, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ pb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Manage API keys to authenticate external tools and scripts with your account.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyMcpConfig}>
              Copy MCP Config
            </Button>
            <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
              Add API Key
            </Button>
          </Stack>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ApiKeyTable />
        </Box>
      </Box>
      <ApiKeyCreateDialog open={isCreateDialogOpen} onClose={handleCloseCreateDialog} />
    </Box>
  );
}
