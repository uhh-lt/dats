import { Button, ButtonProps, Dialog, DialogActions, DialogTitle, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";

export interface WhiteboardSettingsDialogProps {
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function WhiteboardSettingsDialog({ buttonProps }: WhiteboardSettingsDialogProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleSave = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="Whiteboard settings">
        <IconButton onClick={handleOpen} {...buttonProps}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Dialog onClose={() => setOpen(false)} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Whiteboard Settings</DialogTitle>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default WhiteboardSettingsDialog;
