import { Box, Button, Stack, Typography } from "@mui/material";
import { MRT_RowSelectionState, MRT_TableInstance } from "material-react-table";
import { useCallback } from "react";
import { TableRowWithId } from "../_types/TableRowWithId";
import { FilterTableToolbarProps } from "./FilterTableToolbarProps";

interface UseRenderFilterToolbarsProps<T extends TableRowWithId, TToolbarProps extends FilterTableToolbarProps<T>> {
  name: string;
  flatData: T[];
  totalFetched: number;
  totalResults: number;
  handleFetchAll: () => void;
  renderTopRightToolbar: (props: TToolbarProps) => React.ReactNode;
  renderTopLeftToolbar: (props: TToolbarProps) => React.ReactNode;
  renderBottomToolbar?: (props: TToolbarProps) => React.ReactNode;
  toolbarExtraProps: Omit<TToolbarProps, keyof FilterTableToolbarProps<T>>;
  rowSelectionModel: MRT_RowSelectionState;
  tableContainerRef: React.RefObject<HTMLElement | null>;
}

export const useRenderFilterToolbars = <T extends TableRowWithId, TToolbarProps extends FilterTableToolbarProps<T>>({
  name,
  flatData,
  totalFetched,
  totalResults,
  handleFetchAll,
  renderTopRightToolbar,
  renderTopLeftToolbar,
  renderBottomToolbar,
  toolbarExtraProps,
  rowSelectionModel,
  tableContainerRef,
}: UseRenderFilterToolbarsProps<T, TToolbarProps>) => {
  const getToolbarProps = useCallback(
    (table: MRT_TableInstance<T>) =>
      ({
        ...toolbarExtraProps,
        table,
        selectedData: flatData.filter((row) => rowSelectionModel[row.id]),
        anchor: tableContainerRef,
      }) as TToolbarProps,
    [toolbarExtraProps, flatData, rowSelectionModel, tableContainerRef],
  );

  // rendering
  const renderTopLeftToolbarContent = useCallback(
    (props: { table: MRT_TableInstance<T> }) => renderTopLeftToolbar(getToolbarProps(props.table)),
    [renderTopLeftToolbar, getToolbarProps],
  );

  const renderTopRightToolbarContent = useCallback(
    (props: { table: MRT_TableInstance<T> }) => renderTopRightToolbar(getToolbarProps(props.table)),
    [renderTopRightToolbar, getToolbarProps],
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
        {renderBottomToolbar && renderBottomToolbar(getToolbarProps(props.table))}
      </Stack>
    ),
    [totalFetched, totalResults, name, handleFetchAll, renderBottomToolbar, getToolbarProps],
  );

  return {
    renderTopLeftToolbarContent,
    renderTopRightToolbarContent,
    renderBottomToolbarContent,
  };
};
