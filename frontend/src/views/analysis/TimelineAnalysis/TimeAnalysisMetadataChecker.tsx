import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import MetadataHooks from "../../../api/MetadataHooks";
import ProjectHooks from "../../../api/ProjectHooks";
import { SourceDocumentMetadataRead } from "../../../api/openapi";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { AnalysisActions } from "../analysisSlice";

interface TimelineAnalysisMetadataCheckerProps {
  projectId: number;
}

function TimelineAnalysisMetadataChecker({ projectId }: TimelineAnalysisMetadataCheckerProps) {
  // redux
  const metadataKey = useAppSelector((state) => state.analysis.metadataKey);
  const metadataCheckerOpen = useAppSelector((state) => state.analysis.metadataCheckerOpen);
  const dispatch = useAppDispatch();

  // global server state (react query)
  const metadata = ProjectHooks.useGetMetadataByKey(projectId, metadataKey);
  const numCorrectMetadata = metadata.data?.filter((m) => m.value.match(/^\d{4}-\d{2}-\d{2}$/)).length ?? 0;

  // event handling
  const handleClose = () => dispatch(AnalysisActions.setMetadataCheckerOpen(false));

  return (
    <Dialog open={metadataCheckerOpen} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Validate metadata key '{metadataKey}'</DialogTitle>
      <DialogContent>
        {metadata.isSuccess ? (
          <>
            {metadata.data.length > 0 ? (
              <>
                <Box mb={2}>
                  {numCorrectMetadata === metadata.data.length ? (
                    <Typography>
                      <Typography sx={{ fontWeight: 1000, color: (theme) => theme.palette.success.main }} component="b">
                        Validation success!
                      </Typography>{" "}
                      Found {metadata.data.length} documents with metadata '{metadataKey}'. Please make sure that the
                      date string is formatted properly (e.g.YYYY-MM-DD).
                    </Typography>
                  ) : (
                    <Typography>
                      <Typography sx={{ fontWeight: 1000, color: (theme) => theme.palette.warning.main }} component="b">
                        Validation failed!
                      </Typography>{" "}
                      Found {metadata.data.length} documents with metadata '{metadataKey}'. Please make sure that the
                      date string is formatted as YYYY-MM-DD.
                    </Typography>
                  )}

                  <Stack direction="row" alignItems="center">
                    <Typography flexShrink={0}>
                      Currently, {numCorrectMetadata} documents have the correct format!
                    </Typography>
                    <Button onClick={() => metadata.refetch()}>Re-validate</Button>
                  </Stack>
                </Box>
                <Stack spacing={1}>
                  {metadata.data.map((m) => (
                    <MetadataEditor key={m.id} metadata={m} />
                  ))}
                </Stack>
              </>
            ) : (
              <Typography>
                <Typography sx={{ fontWeight: 1000, color: (theme) => theme.palette.error.main }} component="b">
                  Validation failed!
                </Typography>{" "}
                Found {metadata.data.length} documents with metadata '{metadataKey}'. Please use a different metadata
                key.
              </Typography>
            )}
          </>
        ) : (
          <>Loading</>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

interface MetadataUpdateFormValues {
  value: string;
}

interface MetadataEditorProps {
  metadata: SourceDocumentMetadataRead;
}

const toYYYYMMDD = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

function MetadataEditor({ metadata }: MetadataEditorProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    trigger,
    getValues,
  } = useForm<MetadataUpdateFormValues>();

  // effects
  // initialize form when metadata changes
  useEffect(() => {
    trigger();
  }, [reset, trigger, metadata]);

  // mutation
  const updateMutation = MetadataHooks.useUpdateMetadata();

  // form handling
  const handleUpdateMetadata: SubmitHandler<MetadataUpdateFormValues> = useCallback(
    (data) => {
      // only update if data has changed!
      if (metadata.value !== data.value) {
        const mutation = updateMutation.mutate;
        mutation(
          {
            metadataId: metadata.id,
            requestBody: {
              key: metadata.key,
              value: data.value,
            },
          },
          {
            onSuccess: (metadata: SourceDocumentMetadataRead) => {
              SnackbarAPI.openSnackbar({
                text: `Updated metadata ${metadata.id} for document ${metadata.source_document_id}`,
                severity: "success",
              });
            },
          }
        );
      }
    },
    [metadata.key, metadata.value, metadata.id, updateMutation.mutate]
  );
  const handleError: SubmitErrorHandler<MetadataUpdateFormValues> = useCallback((data) => console.error(data), []);

  return (
    <form onSubmit={handleSubmit(handleUpdateMetadata, handleError)}>
      <FormControl fullWidth>
        <Stack direction="row" spacing={1} alignItems="center">
          <Stack>
            <Typography noWrap flexShrink="0">
              Document {metadata.source_document_id} date
            </Typography>
            {Date.parse(getValues("value")) && (
              <Typography noWrap flexShrink="0" variant="subtitle2">
                parsed as {toYYYYMMDD(new Date(Date.parse(getValues("value"))))}
              </Typography>
            )}
          </Stack>

          <TextField
            defaultValue={metadata.value}
            {...register("value", {
              required: "Value is required",
              validate: (v) => {
                return Date.parse(v) ? true : "Value must be formatted properly";
              },
            })}
            error={Boolean(errors.value)}
            fullWidth
            size="small"
            variant="outlined"
            disabled={metadata.read_only}
          />

          <Button sx={{ height: "40px" }} variant="outlined" startIcon={<SaveIcon />} type="submit">
            Save
          </Button>
        </Stack>
        <FormHelperText error={Boolean(errors.value)}>
          <ErrorMessage errors={errors} name="value" />
        </FormHelperText>
      </FormControl>
    </form>
  );
}

export default TimelineAnalysisMetadataChecker;
