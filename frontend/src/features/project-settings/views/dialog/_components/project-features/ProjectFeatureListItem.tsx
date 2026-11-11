import { LinearProgressWithLabel } from "@components/progress-bars";
import { FeatureHooks, featuresRequiring } from "@core/feature";
import { useTabNavigate } from "@core/navigation";
import { ProjectFeatureMap } from "@core/project";
import { useOpenConfirmationDialog } from "@core/notification";
import { FeatureRead } from "@models/FeatureRead";
import { FeatureStatus } from "@models/FeatureStatus";
import { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import { Box, Button, Chip, ChipProps, Link, ListItem, Stack, Tooltip, Typography } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { memo, useCallback, useMemo } from "react";

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
  /** All features and their states, to tell which enabled features need this one. */
  features: FeatureRead[];
  states: ProjectFeatureMap;
  onActivate: (feature: FeatureRead) => void;
}

export const ProjectFeatureListItem = memo(
  ({ projectId, feature, state, features, states, onActivate }: ProjectFeatureListItemProps) => {
    // the enabled features that need this one: it cannot be disabled while they are enabled
    const neededBy = useMemo(() => {
      const requires = new Map(features.map((f) => [f.feature, f.requires_features]));
      const enabled = features.filter((f) => states[f.feature]?.enabled).map((f) => f.feature);
      const titles = new Map(features.map((f) => [f.feature, f.title]));
      return featuresRequiring(enabled, feature.feature, requires).map((f) => titles.get(f) ?? f);
    }, [features, states, feature.feature]);

    // disable
    const openConfirmationDialog = useOpenConfirmationDialog();
    const { mutate: disableFeatureMutation, isPending: isDisablePending } = FeatureHooks.useDisableFeature();
    const isComputing = state.status === FeatureStatus.COMPUTING;
    const handleClickDisable = useCallback(() => {
      openConfirmationDialog({
        text: `Do you really want to disable ${feature.title}? It is hidden in this project and not computed for new uploads anymore.${isComputing ? " The computation in progress stops." : ""} Its data is kept, so enabling it again only computes the documents that lack it.`,
        onAccept: () => disableFeatureMutation({ projectId, feature: feature.feature }),
      });
    }, [disableFeatureMutation, feature.feature, feature.title, isComputing, openConfirmationDialog, projectId]);

    const handleClickActivate = useCallback(() => onActivate(feature), [feature, onActivate]);

    // failed documents are recomputed in the document health view
    const tabNavigate = useTabNavigate();
    const { close: closeSettings } = useDialogBus("projectSettings");
    const handleClickHealth = useCallback(() => {
      closeSettings();
      tabNavigate({ to: "/project/$projectId/tools/health", params: { projectId } });
    }, [closeSettings, projectId, tabNavigate]);

    const lacking = state.failed_documents + state.not_planned_documents;
    const lackingDetails = [
      state.failed_documents > 0 ? `${formatCount(state.failed_documents)} failed` : null,
      state.not_planned_documents > 0 ? `${formatCount(state.not_planned_documents)} not computed` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const chip = STATUS_CHIP[state.status];

    // every enabled feature can be disabled, unless an enabled feature needs it
    const disableButton = (
      <Tooltip
        title={
          neededBy.length > 0
            ? `${neededBy.join(", ")} ${neededBy.length === 1 ? "needs" : "need"} this feature. Disable ${neededBy.length === 1 ? "it" : "them"} first.`
            : ""
        }
      >
        <span>
          <Button
            variant="outlined"
            color="error"
            onClick={handleClickDisable}
            disabled={neededBy.length > 0}
            loading={isDisablePending}
          >
            Disable
          </Button>
        </span>
      </Tooltip>
    );

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
      case FeatureStatus.COMPUTING:
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
            <Typography variant="subtitle1">{feature.title}</Typography>
            <Chip size="small" label={chip.label} color={chip.color} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {feature.description}
          </Typography>
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
  },
);
