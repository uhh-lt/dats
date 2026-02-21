import { Stack } from "@mui/material";
import { ReduxFilterDialog } from "../FilterDialog/ReduxFilterDialog.tsx";
import { FilterTableToolbarProps } from "./FilterTableToolbarProps.ts";
import { TableRowWithId } from "./types/TableRowWithId.ts";

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
