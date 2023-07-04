import { ErrorMessage } from "@hookform/error-message";
import { PlayCircle } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import CrawlerHooks from "../../../api/CrawlerHooks";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";

interface CrawlerRunDialogProps {
  projectId: number;
}

type CrawlerFormValues = {
  urls: string;
};

function isValidHttpUrl(string: string): boolean {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

export interface CrawlerRunDialogHandle {
  open: () => void;
}

const CrawlerRunDialog = forwardRef<CrawlerRunDialogHandle, CrawlerRunDialogProps>(({ projectId }, ref) => {
  // crawler urls
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // react form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CrawlerFormValues>();

  // exposed methods (via forward ref)
  useImperativeHandle(ref, () => ({
    open: openDialog,
  }));

  // methods
  const openDialog = () => {
    reset();
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  // mutations (react-query)
  const startCrawlerMutation = CrawlerHooks.useStartCrawlerJob();
  const handleSubmitRun: SubmitHandler<CrawlerFormValues> = (data) => {
    startCrawlerMutation.mutate(
      {
        requestBody: { project_id: projectId, urls: data.urls.split("\n") },
      },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: `Added new Crawler! (ID: ${data.id})`,
            severity: "success",
          });
          closeDialog();
        },
      }
    );
  };

  const handleErrorCodeCreateDialog: SubmitErrorHandler<CrawlerFormValues> = (data) => console.error(data);

  return (
    <Dialog open={isDialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleSubmitRun, handleErrorCodeCreateDialog)}>
        <DialogTitle>Start new Crawler</DialogTitle>
        <DialogContent>
          <TextField
            label="URLs (one per line)"
            fullWidth
            variant="standard"
            rows={5}
            multiline
            {...register("urls", {
              validate: (value) => {
                if (value.trim().length === 0) {
                  return "At least one URL is required";
                }

                const urls = value.split("\n");

                let i = 1;
                for (const url of urls) {
                  if (!isValidHttpUrl(url.trim())) {
                    return "Invalid URL at line " + i + ". URLs must start with http:// or https://.";
                  }
                  i += 1;
                }

                return true;
              },
            })}
            error={Boolean(errors.urls)}
            helperText={<ErrorMessage errors={errors} name="urls" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Close</Button>
          <Box sx={{ flexGrow: 1 }} />
          <LoadingButton
            variant="contained"
            color="success"
            type="submit"
            loading={startCrawlerMutation.isLoading}
            loadingPosition="start"
            startIcon={<PlayCircle />}
          >
            Start Crawler Job!
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
});

export default CrawlerRunDialog;
