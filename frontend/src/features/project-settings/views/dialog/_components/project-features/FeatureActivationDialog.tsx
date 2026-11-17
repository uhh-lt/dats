import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { DEFAULT_PROCESSING_SETTINGS } from "@components/defaultProcessingSettings";
import { FeatureHooks } from "@core/feature";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { FeatureRead } from "@models/FeatureRead";
import { FeatureStatus } from "@models/FeatureStatus";
import { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback } from "react";
import { useRefreshHealthTable } from "./_hooks/useRefreshHealthTable";

interface FeatureActivationDialogProps {
  projectId: number;
  /** The feature to enable or complete; the dialog is open while it is set. */
  feature: FeatureRead | null;
  state: ProjectFeatureRead | undefined;
  onClose: () => void;
}

/**
 * Enable a disabled feature or complete a partly available one: states how many documents are processed. The core steps
 * it may plan for a document that lacks them run with the default processing settings.
 */
export function FeatureActivationDialog({ projectId, feature, state, onClose }: FeatureActivationDialogProps) {
  const { isMaximized, toggleMaximize } = useDialogMaximize();
  const isComplete = state?.status === FeatureStatus.PARTLY_AVAILABLE;
  const verb = isComplete ? "Complete" : "Enable";

  const refreshHealthTable = useRefreshHealthTable();
  const handleSuccess = useCallback(() => {
    refreshHealthTable();
    onClose();
  }, [onClose, refreshHealthTable]);
  const { mutate: enableFeatureMutation, isPending: isEnablePending } = FeatureHooks.useEnableFeature();
  const { mutate: completeFeatureMutation, isPending: isCompletePending } = FeatureHooks.useCompleteFeature();
  const handleActivate = useCallback(() => {
    if (!feature) return;
    const mutate = isComplete ? completeFeatureMutation : enableFeatureMutation;
    mutate(
      { projectId, feature: feature.feature, requestBody: { settings: DEFAULT_PROCESSING_SETTINGS } },
      { onSuccess: handleSuccess },
    );
  }, [completeFeatureMutation, enableFeatureMutation, feature, handleSuccess, isComplete, projectId]);

  const count = state?.lacking_documents ?? 0;
  const needs = feature ? feature.artefacts.map((artefact) => artefact.title).join(", ") : "";

  return (
    <Dialog open={feature !== null} onClose={closeOnEscape(onClose)} maxWidth="sm" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title={`${verb} ${feature ? feature.title : "feature"}`}
        onClose={onClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={2}>
          <Typography>{feature?.description}</Typography>
          <Typography>
            {state?.total_documents === 0
              ? "Nothing is computed: the project has no documents yet."
              : count === 0
                ? `Nothing is computed: every document already has its data (${needs}).`
                : `Computes ${needs} for ${count.toLocaleString("en-US")} ${count === 1 ? "document" : "documents"} in the background${isComplete ? ` (${count === 1 ? "its" : "their"} data failed or was never computed)` : ""}. The feature can be used while it is computing.`}
          </Typography>
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
