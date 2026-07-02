import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton } from "material-react-table";
import { HealthTableToolbarProps } from "./HealthTableToolbarProps";

export function HealthTableToolbarRight({ table, onRefetch, isRefreshing }: HealthTableToolbarProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <Tooltip title="Refresh table">
        <span>
          <IconButton loading={isRefreshing} onClick={onRefetch}>
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
