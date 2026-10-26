import { Stack } from "@mui/material";
import { MRT_RowData } from "material-react-table";
import { ReduxFilterPopover } from "../filter-popovers";
import { ReduxFilterTableToolbarProps } from "./FilterTableToolbarProps";

export function ReduxFilterTableToolbarLeft<T extends MRT_RowData>({
  anchor,
  filterName,
  filterActions,
  filterStateSelector,
  tableInfoOptions,
}: ReduxFilterTableToolbarProps<T>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <ReduxFilterPopover
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterActions={filterActions}
        filterStateSelector={filterStateSelector}
        tableInfoOptions={tableInfoOptions}
      />
    </Stack>
  );
}
