import { Stack } from "@mui/material";
import { TableRowWithId } from "../_types/TableRowWithId";
import { ReduxFilterDialog } from "../redux-filter-dialog/ReduxFilterDialog";
import { FilterTableToolbarProps } from "./FilterTableToolbarProps";

export function FilterTableToolbarLeft<T extends TableRowWithId>({
  anchor,
  filterName,
  filterActions,
  filterStateSelector,
}: FilterTableToolbarProps<T>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterActions={filterActions}
        filterStateSelector={filterStateSelector}
      />
    </Stack>
  );
}
