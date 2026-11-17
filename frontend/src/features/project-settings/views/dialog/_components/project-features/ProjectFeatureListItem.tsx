import { LinearProgressWithLabel } from "@components/progress-bars";
import { FeatureHooks } from "@core/feature";
import { useTabNavigate } from "@core/navigation";
import { useOpenConfirmationDialog } from "@core/notification";
import { FeatureRead } from "@models/FeatureRead";
import { FeatureStatus } from "@models/FeatureStatus";
import { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import { Box, Button, Chip, ChipProps, Link, ListItem, Stack, Tooltip, Typography } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { memo, useCallback } from "react";
import { useRefreshHealthTable } from "./_hooks/useRefreshHealthTable";

const STATUS_CHIP: Record<FeatureStatus, { label: string; color: ChipProps["color"] }> = {
  [FeatureStatus.DISABLED]: { label: "Disabled", color: "default" },
  [FeatureStatus.COMPUTING]: { label: "Computing", color: "info" },
  [FeatureStatus.PARTLY_AVAILABLE]: { label: "Partly available", color: "warning" },
  [FeatureStatus.FULLY_AVAILABLE]: { label: "Fully available", color: "success" },
};

const formatCount = (count: number) => count.toLocaleString("en-US");

interface ProjectFeatureListItemProps {
  projectId: number;
  feature: FeatureRead;
  state: ProjectFeatureRead;
  /** Enable or complete the feature (by its status). */
  onActivate: (feature: FeatureRead) => void;
}

export const ProjectFeatureListItem = memo(({ projectId, feature, state, onActivate }: ProjectFeatureListItemProps) => {
  // disable
  const openConfirmationDialog = useOpenConfirmationDialog();
  const { mutate: disableFeatureMutation, isPending: isDisablePending } = FeatureHooks.useDisableFeature();
  const refreshHealthTable = useRefreshHealthTable();
  const { title, description } = feature;
  const handleClickDisable = useCallback(() => {
    openConfirmationDialog({
      text: `Do you really want to disable ${title}? It is hidden in this project and not computed for new uploads anymore. Its data is kept, so enabling it again only computes the documents that lack it.`,
      onAccept: () =>
        disableFeatureMutation({ projectId, feature: feature.feature }, { onSuccess: refreshHealthTable }),
    });
  }, [disableFeatureMutation, feature.feature, title, openConfirmationDialog, projectId, refreshHealthTable]);

  const handleClickActivate = useCallback(() => onActivate(feature), [feature, onActivate]);

  // failed documents are recomputed in the document health view
  const tabNavigate = useTabNavigate();
  const { close: closeSettings } = useDialogBus("projectSettings");
  const handleClickHealth = useCallback(() => {
    closeSettings();
    tabNavigate({ to: "/project/$projectId/tools/health", params: { projectId } });
  }, [closeSettings, projectId, tabNavigate]);

  const lacking = state.lacking_documents;
  const lackingDetails = [
    state.failed_documents > 0 ? `${formatCount(state.failed_documents)} failed` : null,
    state.not_planned_documents > 0 ? `${formatCount(state.not_planned_documents)} not computed` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const chip = STATUS_CHIP[state.status];
  const needs = feature.artefacts.map((artefact) => artefact.title).join(", ");

  // a partly or fully available feature can be disabled
  const disableButton = (
    <Button variant="outlined" color="error" onClick={handleClickDisable} loading={isDisablePending}>
      Disable
    </Button>
  );

  // only the actions allowed in the status; a computing feature allows none until it stops computing
  let action = null;
  switch (state.status) {
    case FeatureStatus.DISABLED:
      action = (
        <Button variant="outlined" onClick={handleClickActivate}>
          Enable
        </Button>
      );
      break;
    case FeatureStatus.PARTLY_AVAILABLE:
      action = (
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" color="warning" onClick={handleClickActivate}>
            Complete
          </Button>
          {disableButton}
        </Stack>
      );
      break;
    case FeatureStatus.FULLY_AVAILABLE:
      action = disableButton;
      break;
  }

  return (
    <ListItem
      divider
      sx={{
        // narrow screens: the actions go below the description
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "flex-start" },
        gap: { xs: 1, sm: 2 },
        py: 1.5,
      }}
    >
      <Box flexGrow={1} minWidth={0}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle1">{title}</Typography>
          <Chip size="small" label={chip.label} color={chip.color} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {needs && (
          <Typography variant="caption" color="text.secondary" component="div" mt={0.5}>
            Needs: {needs}
            {state.status === FeatureStatus.DISABLED &&
              (state.ready
                ? " · its data is complete, enabling it computes nothing"
                : ` · ${formatCount(lacking)} of ${formatCount(state.total_documents)} documents lack it`)}
          </Typography>
        )}
        {state.status === FeatureStatus.COMPUTING && (
          <Box mt={1} ml={-3}>
            <LinearProgressWithLabel
              variant="determinate"
              current={state.covered_documents}
              max={Math.max(state.total_documents, 1)}
              tooltip={`${formatCount(state.processing_documents)} documents are processing`}
            />
          </Box>
        )}
        {state.status !== FeatureStatus.DISABLED && (
          <Typography variant="caption" color="text.secondary" component="div" mt={0.5}>
            {formatCount(state.covered_documents)} of {formatCount(state.total_documents)} documents
            {state.status === FeatureStatus.PARTLY_AVAILABLE &&
              ` · ${formatCount(lacking)} without data (${lackingDetails})`}
            {state.status === FeatureStatus.PARTLY_AVAILABLE && state.failed_documents > 0 && (
              <>
                {" · "}
                <Tooltip title="Recompute the failed steps in the Document Health view; the feature is fully available once they succeed.">
                  <Link component="button" variant="caption" onClick={handleClickHealth}>
                    Open Document Health
                  </Link>
                </Tooltip>
              </>
            )}
          </Typography>
        )}
      </Box>
      <Box flexShrink={0} pt={0.5}>
        {action}
      </Box>
    </ListItem>
  );
});
