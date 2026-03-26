import { Stack } from "@mui/material";
import { MRT_RowData } from "material-react-table";
import { FilterDialog } from "../filter-dialogs";
import { LocalFilterTableToolbarProps } from "./FilterTableToolbarProps";

export function LocalFilterTableToolbarLeft<T extends MRT_RowData, U extends string = string>({
  anchor,
  filterName,
  filter,
  onFilterChange,
  expertMode,
  onExpertModeChange,
  column2Info,
  defaultFilterExpression,
}: LocalFilterTableToolbarProps<T, U>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <FilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filter={filter}
        onFilterChange={onFilterChange}
        expertMode={expertMode}
        onExpertModeChange={onExpertModeChange}
        column2Info={column2Info}
        defaultFilterExpression={defaultFilterExpression}
      />
    </Stack>
  );
}
