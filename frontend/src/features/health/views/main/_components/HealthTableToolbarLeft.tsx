import { LLMHooks } from "@api/hooks/LLMHooks";
import { ProcessingSettingsButton } from "@components/ProcessingSettingsButton";
import { Button, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { HealthTableToolbarProps } from "./HealthTableToolbarProps";

export function HealthTableToolbarLeft({
  selectedRows,
  tableColumnInfo,
  settings,
  onChangeSettings,
  isRetryPending,
  isRecomputePending,
  onRetry,
  onRecompute,
}: HealthTableToolbarProps) {
  const availableLLMs = LLMHooks.useGetAvailableLLMs();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (selectedRows.length === 0) {
    return null;
  }

  return (
    <>
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
            After selecting a step, this action <u>recomputes</u> it for the selected documents
          </>
        }
        placement="top-start"
      >
        <span>
          <Button onClick={(event) => setAnchorEl(event.currentTarget)} loading={isRecomputePending}>
            Recompute
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            {tableColumnInfo.map((step) => (
              <MenuItem
                key={step}
                onClick={() => {
                  onRecompute(step);
                  setAnchorEl(null);
                }}
              >
                {step}
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
    </>
  );
}
