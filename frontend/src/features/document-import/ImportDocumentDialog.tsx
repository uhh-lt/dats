import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LanguageIcon from "@mui/icons-material/Language";
import eventBus from "../../EventBus";

export default function ImportDocumentDialog() {
  // state
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // methods
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  // effects
  useEffect(() => {
    eventBus.on("onOpenImportDocumentDialog", openModal);
    return () => {
      eventBus.remove("onOpenImportDocumentDialog", openModal);
    };
  }, [openModal]);

  const steps = ["Select file", "Edit metadata", "Verify"];

  return (
    <div>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Import new document</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => {
              return (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              );
            })}
          </Stepper>
          {activeStep === 0 ? (
            <React.Fragment>
              <Stack spacing={2} sx={{ pr: 8, pl: 8, alignItems: "center" }}>
                <Button fullWidth variant="contained" component="label" startIcon={<UploadFileIcon />}>
                  Upload file from your machine
                  <input type="file" hidden />
                </Button>
                <Typography fontWeight={500}>OR</Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-end",
                    width: "100%",
                  }}
                >
                  <LanguageIcon sx={{ color: "action.active", mr: 1, my: 0.5 }} />
                  <TextField fullWidth label="Provide URL to a website" variant="standard" />
                </Box>
              </Stack>
            </React.Fragment>
          ) : activeStep === 1 ? (
            <React.Fragment>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <LanguageIcon sx={{ color: "action.active", mr: 1, my: 0.5 }} />
                  <TextField fullWidth label="Author" variant="standard" />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <LanguageIcon sx={{ color: "action.active", mr: 1, my: 0.5 }} />
                  <TextField fullWidth label="Date" variant="standard" type="date" InputLabelProps={{ shrink: true }} />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <LanguageIcon sx={{ color: "action.active", mr: 1, my: 0.5 }} />
                  <TextField fullWidth label="Tags" variant="standard" />
                </Box>
              </Stack>
            </React.Fragment>
          ) : activeStep === 2 ? (
            <React.Fragment>
              <Typography sx={{ mt: 2, mb: 1 }}>Step 2</Typography>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Typography sx={{ mt: 2, mb: 1 }}>Error!</Typography>
            </React.Fragment>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
            Back
          </Button>
          <Box sx={{ flex: "1 1 auto" }} />
          {activeStep === steps.length - 1 ? (
            <Button onClick={handleClose}>Finish</Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}
