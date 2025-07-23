import { Close, Fullscreen, FullscreenExit } from "@mui/icons-material";
import { Box, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import React, { memo } from "react";

interface DialogHeaderProps {
  title: string | React.ReactNode;
  onClose: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

function DATSDialogHeader({ title, onClose, isMaximized, onToggleMaximize }: DialogHeaderProps) {
  return (
    <Toolbar
      sx={(theme) => ({
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1} width="100%">
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, overflow: "hidden" }}>
          <Box whiteSpace="nowrap" display="flex" alignItems="center">
            {title}
          </Box>
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onToggleMaximize}>
          {isMaximized ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
        <IconButton edge="end" color="inherit" onClick={onClose}>
          <Close />
        </IconButton>
      </Stack>
    </Toolbar>
  );
}

export default memo(DATSDialogHeader);
