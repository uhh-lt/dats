import { generalQueries } from "@api/general/generalQueries";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { DEFAULT_PROCESSING_SETTINGS } from "@components/defaultProcessingSettings";
import { ProcessingSettingsButton } from "@components/ProcessingSettingsButton";
import { FeatureHooks } from "@core/feature";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { FeatureRead } from "@models/FeatureRead";
import { FeatureStatus } from "@models/FeatureStatus";
import { ProcessingSettings } from "@models/ProcessingSettings";
import { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback, useState } from "react";
import { useRefreshHealthTable } from "./_hooks/useRefreshHealthTable";

interface FeatureActivationDialogProps {
  projectId: number;
  /** The feature to enable or complete; the dialog is open while it is set. */
  feature: FeatureRead | null;
  state: ProjectFeatureRead | undefined;
  onClose: () => void;
}

/**
 * Enable a disabled feature or complete a partly available one: states how many documents are processed and lets the
 * user choose the processing settings, like the upload.
 */
export function FeatureActivationDialog({ projectId, feature, state, onClose }: FeatureActivationDialogProps) {
  const { isMaximized, toggleMaximize } = useDialogMaximize();
  const availableLLMs = useQuery(generalQueries.availableModels());
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULT_PROCESSING_SETTINGS);

  const handleClose = useCallback(() => {
    setSettings(DEFAULT_PROCESSING_SETTINGS);
    onClose();
  }, [onClose]);

  const isComplete = state?.status === FeatureStatus.PARTLY_AVAILABLE;
  const verb = isComplete ? "Complete" : "Enable";

  const refreshHealthTable = useRefreshHealthTable();
  const handleSuccess = useCallback(() => {
    refreshHealthTable();
    handleClose();
  }, [handleClose, refreshHealthTable]);
  const { mutate: enableFeatureMutation, isPending: isEnablePending } = FeatureHooks.useEnableFeature();
  const { mutate: completeFeatureMutation, isPending: isCompletePending } = FeatureHooks.useCompleteFeature();
  const handleActivate = useCallback(() => {
    if (!feature) return;
    const mutate = isComplete ? completeFeatureMutation : enableFeatureMutation;
    mutate({ projectId, feature: feature.feature, requestBody: { settings } }, { onSuccess: handleSuccess });
  }, [completeFeatureMutation, enableFeatureMutation, feature, handleSuccess, isComplete, projectId, settings]);

  const count = state?.lacking_documents ?? 0;

  return (
    <Dialog
      open={feature !== null}
      onClose={closeOnEscape(handleClose)}
      maxWidth="sm"
      fullWidth
      fullScreen={isMaximized}
    >
      <DATSDialogHeader
        title={`${verb} ${feature ? feature.title : "feature"}`}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={2}>
          <Typography>{feature?.description}</Typography>
          <Typography>
            {count === 0
              ? "No document needs to be processed."
              : `${count.toLocaleString("en-US")} ${count === 1 ? "document is" : "documents are"} processed in the background${isComplete ? ` (${count === 1 ? "its" : "their"} data failed or was never computed)` : ""}. The feature can be used while it is computing.`}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={500}>
                Processing settings
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Model, language and keyword settings used for the processing.
              </Typography>
            </Box>
            <ProcessingSettingsButton
              settings={settings}
              onChangeSettings={setSettings}
              availableLLMs={availableLLMs.data || []}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="success"
          startIcon={<PlayCircleIcon />}
          onClick={handleActivate}
          loading={isEnablePending || isCompletePending}
          loadingPosition="start"
          fullWidth
        >
          {verb} feature
        </Button>
      </DialogActions>
    </Dialog>
  );
}
