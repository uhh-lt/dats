import { generalQueries } from "@api/general/generalQueries";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { DEFAULT_PROCESSING_SETTINGS } from "@components/defaultProcessingSettings";
import { ProcessingSettingsButton } from "@components/ProcessingSettingsButton";
import { FeatureHooks, FEATURES } from "@core/feature";
import { ProjectFeatureMap } from "@core/project";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { FeatureRead } from "@models/FeatureRead";
import { FeatureStatus } from "@models/FeatureStatus";
import { ProcessingSettings } from "@models/ProcessingSettings";
import { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback, useState } from "react";
import { useRefreshHealthTable } from "./_hooks/useRefreshHealthTable";

interface FeatureActivationDialogProps {
  projectId: number;
  /** The feature to enable, complete or restart; the dialog is open while it is set. */
  feature: FeatureRead | null;
  state: ProjectFeatureRead | undefined;
  /** The states of all features, to name only the required features that are not enabled yet. */
  states: ProjectFeatureMap;
  onClose: () => void;
}

/**
 * Enable a disabled feature, complete a partly available one or restart a computing one: states how many documents are
 * processed and lets the user choose the processing settings, like the upload. Restarting asks for a confirmation, as
 * it may repeat work that is still running.
 */
export function FeatureActivationDialog({ projectId, feature, state, states, onClose }: FeatureActivationDialogProps) {
  const { isMaximized, toggleMaximize } = useDialogMaximize();
  const availableLLMs = useQuery(generalQueries.availableModels());
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULT_PROCESSING_SETTINGS);

  const handleClose = useCallback(() => {
    setSettings(DEFAULT_PROCESSING_SETTINGS);
    onClose();
  }, [onClose]);

  const isComplete = state?.status === FeatureStatus.PARTLY_AVAILABLE;
  const isRestart = state?.status === FeatureStatus.COMPUTING;
  const verb = isRestart ? "Restart" : isComplete ? "Complete" : "Enable";

  const refreshHealthTable = useRefreshHealthTable();
  const handleSuccess = useCallback(() => {
    refreshHealthTable();
    handleClose();
  }, [handleClose, refreshHealthTable]);
  const { mutate: activateFeatureMutation, isPending: isActivatePending } = FeatureHooks.useActivateFeature();
  const { mutate: restartFeatureMutation, isPending: isRestartPending } = FeatureHooks.useRestartFeature();
  const handleActivate = useCallback(() => {
    if (!feature) return;
    const mutate = isRestart ? restartFeatureMutation : activateFeatureMutation;
    mutate({ projectId, feature: feature.feature, requestBody: { settings } }, { onSuccess: handleSuccess });
  }, [activateFeatureMutation, feature, handleSuccess, isRestart, projectId, restartFeatureMutation, settings]);

  const count = !state
    ? 0
    : isRestart
      ? state.processing_documents
      : state.failed_documents + state.not_planned_documents;
  const requiredTitles = (feature?.requires_features ?? [])
    .filter((f) => !states[f]?.enabled)
    .map((f) => FEATURES[f].title);

  return (
    <Dialog
      open={feature !== null}
      onClose={closeOnEscape(handleClose)}
      maxWidth="sm"
      fullWidth
      fullScreen={isMaximized}
    >
      <DATSDialogHeader
        title={`${verb} ${feature ? FEATURES[feature.feature].title : "feature"}`}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={2}>
          <Typography>{feature && FEATURES[feature.feature].description}</Typography>
          {isRestart ? (
            <Typography>
              {`${count.toLocaleString("en-US")} ${count === 1 ? "document is" : "documents are"} still computing. Restart computes ${count === 1 ? "it" : "them"} again in the background, for example when the progress has not moved for a long time.`}
            </Typography>
          ) : (
            <Typography>
              {count === 0
                ? "No document needs to be processed."
                : `${count.toLocaleString("en-US")} ${count === 1 ? "document is" : "documents are"} processed in the background${isComplete ? ` (${count === 1 ? "its" : "their"} data failed or was never computed)` : ""}. The feature can be used while it is computing.`}
            </Typography>
          )}
          {isRestart && (
            <Alert severity="warning">
              Restart may repeat work that is still running: a document whose computation is only slow is computed
              twice.
            </Alert>
          )}
          {!isComplete && !isRestart && requiredTitles.length > 0 && (
            <Typography color="text.secondary">This also enables {requiredTitles.join(", ")}.</Typography>
          )}
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
          color={isRestart ? "warning" : "success"}
          startIcon={isRestart ? <RestartAltIcon /> : <PlayCircleIcon />}
          onClick={handleActivate}
          loading={isActivatePending || isRestartPending}
          loadingPosition="start"
          fullWidth
        >
          {verb} feature
        </Button>
      </DialogActions>
    </Dialog>
  );
}
