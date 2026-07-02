import { Stack } from "@mui/material";
import {
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { FilterTableToolbarProps } from "./FilterTableToolbarProps";

export function FilterTableToolbarRight<T extends MRT_RowData>({ table }: FilterTableToolbarProps<T>) {
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
    </Stack>
  );
}
