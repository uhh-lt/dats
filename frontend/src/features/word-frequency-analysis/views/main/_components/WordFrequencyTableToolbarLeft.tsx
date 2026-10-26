import { URLFilterPopover } from "@core/filter";
import { Stack } from "@mui/material";
import { WordFrequencyTableToolbarProps } from "./WordFrequencyTableToolbarProps";

export function WordFrequencyTableToolbarLeft({
  anchor,
  routeApi,
  defaultFilterExpression,
  tableInfoOptions,
}: WordFrequencyTableToolbarProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <URLFilterPopover
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        routeApi={routeApi}
        defaultFilterExpression={defaultFilterExpression}
        tableInfoOptions={tableInfoOptions}
      />
    </Stack>
  );
}
