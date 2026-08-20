import { Close, Fullscreen, FullscreenExit } from "@mui/icons-material";
import { IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { memo, ReactNode } from "react";

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  startActions?: ReactNode;
  endActions?: ReactNode;
}

export const DATSDialogHeader = memo(
  ({ title, onClose, isMaximized, onToggleMaximize, startActions, endActions }: DialogHeaderProps) => {
    return (
      <Toolbar
        sx={(theme) => ({
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        })}
      >
        <Stack direction="row" alignItems="center" spacing={1} width="100%">
          {startActions}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {endActions}
          <IconButton edge="end" color="inherit" onClick={onToggleMaximize}>
            {isMaximized ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
          <IconButton edge="end" color="inherit" onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>
      </Toolbar>
    );
  },
);
