import { generalQueries } from "@api/general/generalQueries";
import { ProcessingSettingsButton } from "@components/ProcessingSettingsButton";
import { ProcessingSettings } from "@models/ProcessingSettings";
import { SdocHealthColumn } from "@models/SdocHealthColumn";
import { Button, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Dispatch, SetStateAction, useState } from "react";

interface HealthSelectionActionsProps {
  /** The steps planned for at least one selected document; the recompute menu offers only these. */
  plannedSteps: SdocHealthColumn[];
  settings: ProcessingSettings;
  onChangeSettings: Dispatch<SetStateAction<ProcessingSettings>>;
  isRetryPending: boolean;
  isRecomputePending: boolean;
  onRetry: () => void;
  onRecompute: (step: string) => void;
}

/** The actions on the selected documents, shown in the selection banner of the health table next to the selected count. */
export function HealthSelectionActions({
  plannedSteps,
  settings,
  onChangeSettings,
  isRetryPending,
  isRecomputePending,
  onRetry,
  onRecompute,
}: HealthSelectionActionsProps) {
  const availableLLMs = useQuery(generalQueries.availableModels());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip
        title={
          <>
            <Typography>Retry failed steps:</Typography>
            This action runs all <u>failed processing steps</u> again for the selected documents (if any)
          </>
        }
        placement="top-start"
      >
        <span>
          <Button onClick={onRetry} loading={isRetryPending}>
            Retry
          </Button>
        </span>
      </Tooltip>
      <Tooltip
        title={
          <>
            <Typography>Recompute step:</Typography>
            After selecting a step, this action <u>recomputes</u> it for the selected documents. The core steps are
            always offered and planned where they are missing; the steps of a feature only where it is enabled. Enable
            or complete a feature in the project settings to compute its steps.
          </>
        }
        placement="top-start"
      >
        <span>
          <Button
            onClick={(event) => setAnchorEl(event.currentTarget)}
            loading={isRecomputePending}
            disabled={plannedSteps.length === 0}
          >
            Recompute
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            {plannedSteps.map(({ step, title }) => (
              <MenuItem
                key={step}
                onClick={() => {
                  onRecompute(step);
                  setAnchorEl(null);
                }}
              >
                {title}
              </MenuItem>
            ))}
          </Menu>
        </span>
      </Tooltip>
      <ProcessingSettingsButton
        settings={settings}
        onChangeSettings={onChangeSettings}
        availableLLMs={availableLLMs.data || []}
      />
    </Stack>
  );
}
