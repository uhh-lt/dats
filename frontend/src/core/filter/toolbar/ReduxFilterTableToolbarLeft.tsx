import { Stack } from "@mui/material";
import { MRT_RowData } from "material-react-table";
import { ReduxFilterDialog } from "../filter-dialogs";
import { ReduxFilterTableToolbarProps } from "./FilterTableToolbarProps";

export function ReduxFilterTableToolbarLeft<T extends MRT_RowData>({
  anchor,
  filterName,
  filterActions,
  filterStateSelector,
}: ReduxFilterTableToolbarProps<T>) {
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
