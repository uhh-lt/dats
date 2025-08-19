import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { ProcessingSettings } from "../../api/openapi/models/ProcessingSettings";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import FormNumber from "../FormInputs/FormNumber";
import FormSwitch from "../FormInputs/FormSwitch";

interface ProcessingSettingsButtonProps {
  settings: ProcessingSettings;
  onChangeSettings: (settings: ProcessingSettings) => void;
}

const ProcessingSettingsButton: React.FC<ProcessingSettingsButtonProps> = ({ settings, onChangeSettings }) => {
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<ProcessingSettings>({
    defaultValues: settings,
  });

  useEffect(() => {
    if (open) {
      reset(settings);
    }
  }, [open, settings, reset]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const onSubmit = (data: ProcessingSettings) => {
    onChangeSettings(data);
    handleClose();
  };

  const tooltipContent = (
    <Typography variant="body2" component="div">
      <b>Processing Settings</b>
      <br />
      <em>Extract images:</em> {settings.extract_images ? "yes" : "no"}
      <br />
      <em>Pages per chunk:</em> {settings.pages_per_chunk}
    </Typography>
  );

  return (
    <>
      <Tooltip title={tooltipContent} arrow>
        <span>
          <IconButton onClick={handleOpen}>{getIconComponent(Icon.SETTINGS)}</IconButton>
        </span>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          <span style={{ display: "flex", alignItems: "center" }}>
            {getIconComponent(Icon.SETTINGS)}
            <span style={{ marginLeft: 8 }}>Edit Processing Settings</span>
          </span>
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={3}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={500}>
                    Extract images from documents?
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enable to extract embedded images.
                  </Typography>
                </Box>
                <FormSwitch
                  name="extract_images"
                  control={control}
                  boxProps={{ sx: { ml: 2 } }}
                  switchProps={{ size: "medium", color: "primary" }}
                />
              </Box>
              <Divider />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={500}>
                    Pages per chunk
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Split large documents into smaller chunks (1-10).
                  </Typography>
                </Box>
                <FormNumber
                  name="pages_per_chunk"
                  control={control}
                  rules={{
                    required: "Required",
                    min: { value: 1, message: "Must be at least 1" },
                    max: { value: 10, message: "Must be at most 10" },
                  }}
                  textFieldProps={{
                    label: "# pages",
                    variant: "filled",
                    inputProps: { min: 1, max: 10 },
                    fullWidth: false,
                    size: "small",
                    sx: { width: 80, ml: 2 },
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit" startIcon={getIconComponent(Icon.CLOSE)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" startIcon={getIconComponent(Icon.SAVE)}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default ProcessingSettingsButton;
