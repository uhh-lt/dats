import { ErrorMessage } from "@hookform/error-message";
import { PlayCircle } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { forwardRef, memo, useCallback, useImperativeHandle, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import CrawlerHooks from "../../../api/CrawlerHooks.ts";
import FormTextMultiline from "../../FormInputs/FormTextMultiline.tsx";

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
  } catch (e) {
    console.error(e);
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
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<CrawlerFormValues>({
    defaultValues: {
      urls: "",
    },
  });

  // exposed methods (via forward ref)
  useImperativeHandle(ref, () => ({
    open: openDialog,
  }));

  // methods
  const openDialog = useCallback(() => {
    reset();
    setIsDialogOpen(true);
  }, [reset]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  // mutations (react-query)
  const { mutate: startCrawlerMutation, isPending } = CrawlerHooks.useStartCrawlerJob();
  const handleSubmitRun: SubmitHandler<CrawlerFormValues> = useCallback(
    (data) => {
      startCrawlerMutation(
        {
          requestBody: { project_id: projectId, urls: data.urls.split("\n") },
        },
        {
          onSuccess: () => closeDialog(),
        },
      );
    },
    [closeDialog, projectId, startCrawlerMutation],
  );

  const handleErrorCodeCreateDialog: SubmitErrorHandler<CrawlerFormValues> = useCallback(
    (data) => console.error(data),
    [],
  );

  return (
    <Dialog open={isDialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleSubmitRun, handleErrorCodeCreateDialog)}>
        <DialogTitle>URL Import</DialogTitle>
        <DialogContent>
          <FormTextMultiline
            name="urls"
            control={control}
            rules={{
              required: "At least one URL is required",
              validate: (value) => {
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
            }}
            textFieldProps={{
              label: "URLs (one per line)",
              fullWidth: true,
              variant: "standard",
              error: Boolean(errors.urls),
              helperText: <ErrorMessage errors={errors} name="urls" />,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Close</Button>
          <Box sx={{ flexGrow: 1 }} />
          <LoadingButton
            variant="contained"
            color="success"
            type="submit"
            loading={isPending}
            loadingPosition="start"
            startIcon={<PlayCircle />}
          >
            Start URL Import
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
});

export default memo(CrawlerRunDialog);
