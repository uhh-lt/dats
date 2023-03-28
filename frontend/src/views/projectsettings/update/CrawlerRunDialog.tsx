import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import CrawlerHooks from "../../../api/CrawlerHooks";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { useForm } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import { PlayCircle } from "@mui/icons-material";

interface CrawlerRunDialogProps {
  projectId: number;
}

export interface CrawlerRunDialogHandle {
  open: () => void;
}

const CrawlerRunDialog = forwardRef<CrawlerRunDialogHandle, CrawlerRunDialogProps>(({ projectId }, ref) => {
  // crawler urls
  const [tfValue, setTFValue] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // react form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const tfRef = useRef<HTMLDivElement>(null);

  // exposed methods (via forward ref)
  useImperativeHandle(ref, () => ({
    open: openDialog,
  }));

  // methods
  const openDialog = () => {
    reset();
    setIsDialogOpen(true);
    setTFValue("");
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  // ui event handlers
  const handleCloseCodeCreateDialog = () => {
    closeDialog();
  };

  // mutations (react-query)
  const startCrawlerMutation = CrawlerHooks.useStartCrawlerJob();
  const handleSubmitRun = (data: any) => {
    if (tfValue) {
      startCrawlerMutation.mutate(
        {
          requestBody: { project_id: projectId, urls: data.urls.split("\n") },
        },
        {
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Added new Crawler!`,
              severity: "success",
            });
            setTFValue("");
            closeDialog();
          },
        }
      );
    }
  };

  const handleErrorCodeCreateDialog = (data: any) => console.error(data);

  useEffect(() => {
    // TODO: how to append a line break after an URL (tried also with onPaste in TextField)
    if (tfRef.current) {
      tfRef.current.addEventListener("paste", (event) => {
        event.preventDefault();
        setTFValue((prevState) => prevState + "\n");
        console.log("pasted");
      });
    }
  }, []);

  return (
    <Dialog open={isDialogOpen} onClose={handleCloseCodeCreateDialog} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleSubmitRun, handleErrorCodeCreateDialog)}>
        <DialogTitle>Start new Crawler</DialogTitle>
        <DialogContent>
          <TextField
            label="URLs"
            fullWidth
            variant="standard"
            rows={5}
            value={tfValue}
            multiline
            {...register("urls", { required: "At least one URL is required" })}
            error={Boolean(errors.name)}
            helperText={<ErrorMessage errors={errors} name="urls" />}
            onChange={(newValue) => {
              newValue.preventDefault();
              setTFValue(newValue.target.value);
            }}
            ref={tfRef}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCodeCreateDialog}>Close</Button>
          <Button startIcon={<PlayCircle />} variant="outlined" component="label" onClick={handleSubmitRun}>
            Start Crawler!
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
});

export default CrawlerRunDialog;
