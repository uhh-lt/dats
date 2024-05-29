import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import { Box, Button, CircularProgress, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_Row,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_TableOptions,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  createRow,
  useMaterialReactTable,
} from "material-react-table";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserName from "../../components/UserName.tsx";
import { dateToLocaleString } from "../../utils/DateUtils.ts";

export type AnaylsisDashboardRow = {
  id: number;
  title: string;
  updated: string;
  user_id: number;
};

export type AnalysisCreateOption = {
  option: string;
  label: string;
};

export type HandleCreateAnalysis = (
  createOption?: AnalysisCreateOption,
) => MRT_TableOptions<AnaylsisDashboardRow>["onCreatingRowSave"];

export interface UseAnaylsisDashboardTableProps {
  analysisName: string;
  data: AnaylsisDashboardRow[];
  isLoadingData: boolean;
  isFetchingData: boolean;
  isLoadingDataError: boolean;
  isCreatingAnalysis: boolean;
  isUpdatingAnalysis: boolean;
  isDeletingAnalysis: boolean;
  isDuplicatingAnalysis: boolean;
  deletingAnalysisId?: number;
  duplicatingAnalysisId?: number;
  handleDuplicateAnalysis: (row: MRT_Row<AnaylsisDashboardRow>) => void;
  handleDeleteAnalysis: (row: MRT_Row<AnaylsisDashboardRow>) => void;
  handleCreateAnalysis: HandleCreateAnalysis;
  handleEditAnalysis: MRT_TableOptions<AnaylsisDashboardRow>["onEditingRowSave"];
  analysisCreateOptions?: AnalysisCreateOption[];
}

const columns: MRT_ColumnDef<AnaylsisDashboardRow>[] = [
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
  {
    accessorKey: "user_id",
    header: "Owner",
    enableEditing: false,
    Cell: ({ row }) => (row.original.user_id === -1 ? "..." : <UserName userId={row.original.user_id} />),
  },
];

export const useAnalysisDashboardTable = (props: UseAnaylsisDashboardTableProps) => {
  const navigate = useNavigate();

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
  const showCreateAnalysisRow = (table: MRT_TableInstance<AnaylsisDashboardRow>) => {
    table.setCreatingRow(
      createRow(table, {
        id: -1,
        title: "",
        updated: new Date().toISOString(),
        user_id: -1,
      }),
    );
    table.setEditingRow(null); //exit editing mode
  };

  return useMaterialReactTable<AnaylsisDashboardRow>({
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
    // row actions
    muiTableBodyRowProps: ({ row, table }) => {
      const tableState = table.getState();
      return {
        onClick:
          tableState.editingRow || tableState.creatingRow || props.deletingAnalysisId === row.original.id
            ? undefined
            : () => navigate(`./${row.original.id}`),
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
            <EditIcon />
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
                <ContentCopyIcon />
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
                <DeleteIcon />
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
      </Box>
    ),
  });
};
