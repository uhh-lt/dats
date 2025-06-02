import { Box, Button, Stack, Typography } from "@mui/material";
import { MRT_RowSelectionState, MRT_TableInstance } from "material-react-table";
import { useCallback } from "react";
import { ReduxFilterDialogProps } from "../../FilterDialog/ReduxFilterDialogProps.ts";
import { FilterTableToolbarProps } from "../FilterTableToolbarProps.ts";
import { TableRowWithId } from "../types/TableRowWithId.ts";

interface UseRenderToolbarsProps<T extends TableRowWithId> extends ReduxFilterDialogProps {
  name: string;
  flatData: T[];
  totalFetched: number;
  totalResults: number;
  handleFetchAll: () => void;
  renderTopRightToolbar: (props: FilterTableToolbarProps<T>) => React.ReactNode;
  renderTopLeftToolbar: (props: FilterTableToolbarProps<T>) => React.ReactNode;
  renderBottomToolbar?: (props: FilterTableToolbarProps<T>) => React.ReactNode;
  rowSelectionModel: MRT_RowSelectionState;
  tableContainerRef: React.RefObject<HTMLElement>;
}

export const useRenderToolbars = <T extends TableRowWithId>({
  name,
  flatData,
  totalFetched,
  totalResults,
  handleFetchAll,
  renderTopRightToolbar,
  renderTopLeftToolbar,
  renderBottomToolbar,
  filterStateSelector,
  filterActions,
  filterName,
  rowSelectionModel,
  tableContainerRef,
}: UseRenderToolbarsProps<T>) => {
  // rendering
  const renderTopLeftToolbarContent = useCallback(
    (props: { table: MRT_TableInstance<T> }) =>
      renderTopLeftToolbar({
        table: props.table,
        selectedData: flatData.filter((row) => rowSelectionModel[row.id]),
        anchor: tableContainerRef,
        filterStateSelector,
        filterActions,
        filterName,
      }),
    [
      renderTopLeftToolbar,
      flatData,
      tableContainerRef,
      filterStateSelector,
      filterActions,
      filterName,
      rowSelectionModel,
    ],
  );

  const renderBottomToolbarContent = useCallback(
    (props: { table: MRT_TableInstance<T> }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" width="100%">
        <Typography>
          Fetched {totalFetched} of {totalResults} total {name}.
        </Typography>
        <Button size="small" onClick={handleFetchAll}>
          Fetch All
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {renderBottomToolbar &&
          renderBottomToolbar({
            table: props.table,
            selectedData: flatData.filter((row) => rowSelectionModel[row.id]),
            anchor: tableContainerRef,
            filterStateSelector,
            filterActions,
            filterName,
          })}
      </Stack>
    ),
    [
      totalFetched,
      totalResults,
      name,
      handleFetchAll,
      renderBottomToolbar,
      flatData,
      tableContainerRef,
      filterStateSelector,
      filterActions,
      filterName,
      rowSelectionModel,
    ],
  );

  const renderTopRightToolbarContent = useCallback(
    (props: { table: MRT_TableInstance<T> }) =>
      renderTopRightToolbar({
        table: props.table,
        selectedData: flatData.filter((row) => rowSelectionModel[row.id]),
        anchor: tableContainerRef,
        filterStateSelector,
        filterActions,
        filterName,
      }),
    [
      renderTopRightToolbar,
      flatData,
      tableContainerRef,
      filterStateSelector,
      filterActions,
      filterName,
      rowSelectionModel,
    ],
  );

  return {
    renderTopLeftToolbarContent,
    renderTopRightToolbarContent,
    renderBottomToolbarContent,
  };
};
