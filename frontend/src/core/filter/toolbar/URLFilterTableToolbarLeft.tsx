import { Stack } from "@mui/material";
import { MRT_RowData } from "material-react-table";
import { URLFilterDialog } from "../filter-dialogs";
import { URLFilterTableToolbarProps } from "./FilterTableToolbarProps";

export function URLFilterTableToolbarLeft<T extends MRT_RowData>({
  anchor,
  routeApi,
  defaultFilterExpression,
  tableInfoOptions,
}: URLFilterTableToolbarProps<T>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <URLFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        routeApi={routeApi}
        defaultFilterExpression={defaultFilterExpression}
        tableInfoOptions={tableInfoOptions}
      />
    </Stack>
  );
}
