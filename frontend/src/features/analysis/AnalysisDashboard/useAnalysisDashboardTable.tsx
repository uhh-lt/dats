import { Box, Button, CircularProgress, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import {
  createRow,
  MRT_ColumnDef,
  MRT_Row,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_TableOptions,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useState } from "react";
import { ExportAnalysisButtonProps } from "../../../components/Export/ExportTimelineAnalysisButton.tsx";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

export type AnalysisDashboardRow = {
  id: number;
  title: string;
  updated: string;
};

export type AnalysisCreateOption = {
  option: string;
  label: string;
};

export type HandleCreateAnalysis<T extends AnalysisDashboardRow = AnalysisDashboardRow> = (
  createOption?: AnalysisCreateOption,
) => MRT_TableOptions<T>["onCreatingRowSave"];

export interface UseAnaylsisDashboardTableProps<T extends AnalysisDashboardRow> {
  analysisName: string;
  data: T[];
  isLoadingData: boolean;
  isFetchingData: boolean;
  isLoadingDataError: boolean;
  isCreatingAnalysis: boolean;
  isUpdatingAnalysis: boolean;
  isDeletingAnalysis: boolean;
  isDuplicatingAnalysis: boolean;
  deletingAnalysisId?: number;
  duplicatingAnalysisId?: number;
  onOpenAnalysis: (analysisRow: T) => void;
  handleDuplicateAnalysis: (row: MRT_Row<T>) => void;
  handleDeleteAnalysis: (row: MRT_Row<T>) => void;
  handleCreateAnalysis: HandleCreateAnalysis<T>;
  handleEditAnalysis: MRT_TableOptions<T>["onEditingRowSave"];
  analysisCreateOptions?: AnalysisCreateOption[];
  additionalColumns?: MRT_ColumnDef<T>[];
  renderExportButton: (props: ExportAnalysisButtonProps) => JSX.Element;
}

export const useAnalysisDashboardTable = <T extends AnalysisDashboardRow>(props: UseAnaylsisDashboardTableProps<T>) => {
  const columns = useMemo(() => {
    const columns: MRT_ColumnDef<T>[] = [
      { accessorKey: "id", header: "ID", enableEditing: false },
      {
        accessorKey: "title",
        header: "Name",
        enableEditing: true,
      },
      {
        id: "updated",
        header: "Last modified",
        accessorFn: (params) => dateToLocaleString(params.updated as string),
        enableEditing: false,
      },
      ...(props.additionalColumns ?? []),
    ];
    return columns;
  }, [props.additionalColumns]);

  // create option menu
  const [analysisCreateOption, setAnalysisCreateOption] = useState<AnalysisCreateOption | undefined>(undefined);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  const showCreateAnalysisRow = (table: MRT_TableInstance<T>) => {
    table.setCreatingRow(
      createRow(table, {
        id: -1,
        title: "",
        updated: new Date().toISOString(),
      } as T),
    );
    table.setEditingRow(null); //exit editing mode
  };

  return useMaterialReactTable<T>({
    data: props.data,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    state: {
      isLoading: props.isLoadingData,
      isSaving: props.isCreatingAnalysis || props.isUpdatingAnalysis,
      showAlertBanner: props.isLoadingDataError,
      showProgressBars: props.isFetchingData,
    },
    // handle error
    muiToolbarAlertBannerProps: props.isLoadingDataError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // styling
    muiTablePaperProps: {
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // selection
    enableRowSelection: true,
    // row
    muiTableBodyRowProps: ({ row, table }) => {
      const tableState = table.getState();
      return {
        onClick:
          tableState.editingRow || tableState.creatingRow || props.deletingAnalysisId === row.original.id
            ? undefined
            : () => {
                props.onOpenAnalysis(row.original);
              },
      };
    },
    // create analysis inline
    createDisplayMode: "row",
    onCreatingRowSave: props.handleCreateAnalysis(analysisCreateOption),
    renderTopToolbarCustomActions: ({ table }) => (
      <>
        <Button
          variant="contained"
          onClick={(event) => {
            if (props.analysisCreateOptions && props.analysisCreateOptions.length > 0) {
              handleOpenMenu(event);
            } else {
              showCreateAnalysisRow(table);
            }
          }}
        >
          Create New {props.analysisName}
        </Button>
        {props.analysisCreateOptions && (
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseMenu}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
          >
            {props.analysisCreateOptions.map((option) => (
              <MenuItem
                key={option.option}
                onClick={() => {
                  setAnalysisCreateOption(option);
                  showCreateAnalysisRow(table);
                  handleCloseMenu();
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        )}
      </>
    ),
    // edit analysis inline
    enableEditing: true,
    editDisplayMode: "row", // ('modal', 'cell', 'table', and 'custom' are also available)
    onEditingRowSave: props.handleEditAnalysis,
    // scrolling / virtualization
    enablePagination: false,
    enableRowVirtualization: true,
    enableBottomToolbar: false,
    // actions
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: { "mrt-row-actions": { size: 150 } },
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: "flex", gap: "0.5rem" }}>
        <Tooltip title="Edit">
          <IconButton
            onClick={(event) => {
              event.stopPropagation();
              table.setEditingRow(row);
              table.setCreatingRow(null); //exit creating mode
            }}
          >
            <>{getIconComponent(Icon.EDIT)}</>
          </IconButton>
        </Tooltip>
        <Tooltip title="Duplicate">
          <span>
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                props.handleDuplicateAnalysis(row);
              }}
              disabled={props.isDuplicatingAnalysis && props.duplicatingAnalysisId === row.original.id}
            >
              {props.isDuplicatingAnalysis && props.duplicatingAnalysisId === row.original.id ? (
                <CircularProgress size={24} />
              ) : (
                <>{getIconComponent(Icon.DUPLICATE)}</>
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete">
          <span>
            <IconButton
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                props.handleDeleteAnalysis(row);
              }}
              disabled={props.isDeletingAnalysis && props.deletingAnalysisId === row.original.id}
            >
              {props.isDeletingAnalysis && props.deletingAnalysisId === row.original.id ? (
                <CircularProgress size={24} />
              ) : (
                <>{getIconComponent(Icon.DELETE)}</>
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    // default values
    initialState: {
      sorting: [
        {
          id: "updated",
          desc: true,
        },
      ],
      columnVisibility: {
        id: false,
      },
    },
    // toolbar
    renderToolbarInternalActions: ({ table }) => (
      <Box>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        {props.renderExportButton({ analysisIds: table.getSelectedRowModel().flatRows.map((row) => parseInt(row.id)) })}
      </Box>
    ),
  });
};
