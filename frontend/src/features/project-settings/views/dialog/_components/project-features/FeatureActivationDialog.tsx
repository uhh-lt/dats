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

interface FeatureActivationDialogProps {
  projectId: number;
  /** The feature to enable or complete; the dialog is open while it is set. */
  feature: FeatureRead | null;
  state: ProjectFeatureRead | undefined;
  features: FeatureRead[];
  onClose: () => void;
}

/**
 * Enable a disabled feature or complete a partly available one: states how many documents are processed and lets the
 * user choose the processing settings, like the upload.
 */
export function FeatureActivationDialog({
  projectId,
  feature,
  state,
  features,
  onClose,
}: FeatureActivationDialogProps) {
  const { isMaximized, toggleMaximize } = useDialogMaximize();
  const availableLLMs = useQuery(generalQueries.availableModels());
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULT_PROCESSING_SETTINGS);

  const handleClose = useCallback(() => {
    setSettings(DEFAULT_PROCESSING_SETTINGS);
    onClose();
  }, [onClose]);

  const { mutate: activateFeatureMutation, isPending } = FeatureHooks.useActivateFeature();
  const handleActivate = useCallback(() => {
    if (!feature) return;
    activateFeatureMutation(
      { projectId, feature: feature.feature, requestBody: { settings } },
      { onSuccess: handleClose },
    );
  }, [activateFeatureMutation, feature, handleClose, projectId, settings]);

  const isComplete = state?.status === FeatureStatus.PARTLY_AVAILABLE;
  const verb = isComplete ? "Complete" : "Enable";
  const count = state ? state.failed_documents + state.not_planned_documents : 0;
  const requiredTitles = (feature?.requires_features ?? []).map(
    (f) => features.find((other) => other.feature === f)?.title ?? f,
  );

  return (
    <Dialog
      open={feature !== null}
      onClose={closeOnEscape(handleClose)}
      maxWidth="sm"
      fullWidth
      fullScreen={isMaximized}
    >
      <DATSDialogHeader
        title={`${verb} ${feature?.title ?? "feature"}`}
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
              : `${count.toLocaleString("en-US")} ${count === 1 ? "document is" : "documents are"} processed in the background${isComplete ? ": the documents whose data failed or was never computed" : ""}. The feature can be used while it is computing.`}
          </Typography>
          {!isComplete && requiredTitles.length > 0 && (
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
          color="success"
          startIcon={<PlayCircleIcon />}
          onClick={handleActivate}
          loading={isPending}
          loadingPosition="start"
          fullWidth
        >
          {verb} feature
        </Button>
      </DialogActions>
    </Dialog>
  );
}
