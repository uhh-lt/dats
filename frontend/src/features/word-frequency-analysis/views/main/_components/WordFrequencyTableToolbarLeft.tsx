import { URLFilterDialog } from "@core/filter";
import { Stack } from "@mui/material";
import { WordFrequencyTableToolbarProps } from "./WordFrequencyTableToolbarProps";

export function WordFrequencyTableToolbarLeft({
  anchor,
  filterName,
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
}: WordFrequencyTableToolbarProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <URLFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        routeApi={routeApi}
        defaultFilterExpression={defaultFilterExpression}
        column2InfoSelector={column2InfoSelector}
      />
    </Stack>
  );
}
