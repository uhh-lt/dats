import { MRT_RowSelectionState, MRT_SortingState, MRT_TableOptions, MRT_VisibilityState } from "material-react-table";
import { TableRowWithId } from "../_types/TableRowWithId";
import { FilterTableToolbarProps } from "../toolbar/FilterTableToolbarProps";

export interface FilterTableProps<T extends TableRowWithId> {
  projectId: number;
  filterName: string;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<T>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<T>["onSortingChange"];
  // column visibility
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<T>["onColumnVisibilityChange"];
  // fetch sizse
  fetchSize: number;
  onFetchSizeChange: React.Dispatch<React.SetStateAction<number>>;
  // components
  positionToolbarAlertBanner?: MRT_TableOptions<T>["positionToolbarAlertBanner"];
  renderTopRightToolbar?: (props: FilterTableToolbarProps<T>) => React.ReactNode;
  renderTopLeftToolbar?: (props: FilterTableToolbarProps<T>) => React.ReactNode;
  renderBottomToolbar?: (props: FilterTableToolbarProps<T>) => React.ReactNode;
}
