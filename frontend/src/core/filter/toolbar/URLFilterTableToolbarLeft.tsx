import { Stack } from "@mui/material";
import { TableRowWithId } from "../_types/TableRowWithId";
import { URLFilterDialog } from "../filter-dialogs";
import { URLFilterTableToolbarProps } from "./FilterTableToolbarProps";

export function URLFilterTableToolbarLeft<T extends TableRowWithId>({
  anchor,
  filterName,
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
}: URLFilterTableToolbarProps<T>) {
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
