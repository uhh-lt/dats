import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, BoxProps, Button, Divider, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_LinearProgressBar,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  MRT_ToolbarAlertBanner,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useRef, useState } from "react";
import ClassifierHooks from "../../api/ClassifierHooks.ts";
import { ClassifierModel } from "../../api/openapi/models/ClassifierModel.ts";
import { ClassifierRead } from "../../api/openapi/models/ClassifierRead.ts";
import { ClassifierTask } from "../../api/openapi/models/ClassifierTask.ts";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import CardContainer from "../../components/MUI/CardContainer.tsx";
import DATSToolbar from "../../components/MUI/DATSToolbar.tsx";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import ClassifierDetailPanel from "./ClassifierDetailPanel.tsx";

interface ClassifierTableProps {
  projectId: number;
}

const columns: MRT_ColumnDef<ClassifierRead>[] = [
  {
    id: "name",
    header: "Name",
    size: 400,
    accessorFn: (row) => row.name,
  },
  {
    id: "type",
    header: "Type",
    accessorFn: (row) => row.type,
  },
  {
    id: "updated",
    header: "Updated",
    accessorFn: (row) => row.updated,
  },
];

function ClassifierTable({ projectId, ...props }: ClassifierTableProps & BoxProps) {
  // data
  const { data, isError, isFetching, isLoading, refetch } = ClassifierHooks.useGetAllClassifiers();

  // selection
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedRows = useMemo(() => {
    return Object.keys(rowSelectionModel)
      .filter((key) => rowSelectionModel[key])
      .map((key) => parseInt(key))
      .filter((id) => !isNaN(id));
  }, [rowSelectionModel]);

  // classifier actions
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleTrainClassifier = (modelType: ClassifierModel) => {
    setAnchorEl(null);
    dispatch(
      CRUDDialogActions.openClassifierDialog({
        projectId: projectId,
        classifierModel: modelType,
        classifierTask: ClassifierTask.TRAINING,
        classifierStep: 0,
      }),
    );
  };

  const handleEvaluateModel = (classifierId: number, modelType: ClassifierModel) => {
    dispatch(
      CRUDDialogActions.openClassifierDialog({
        projectId: projectId,
        classifierModel: modelType,
        classifierId: classifierId,
        classifierTask: ClassifierTask.EVALUATION,
        classifierStep: 0,
      }),
    );
  };

  const handleInferenceModel = (classifierId: number, modelType: ClassifierModel) => {
    dispatch(
      CRUDDialogActions.openClassifierDialog({
        projectId: projectId,
        classifierModel: modelType,
        classifierId: classifierId,
        classifierTask: ClassifierTask.INFERENCE,
        classifierStep: 0,
      }),
    );
  };

  // classifier deletion
  const handleDeleteClassifier = () => {
    if (selectedRows.length === 0) return;
    console.log("handle classifier deletion!", selectedRows);
  };

  // table
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);
  const table = useMaterialReactTable<ClassifierRead>({
    data: data || [],
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      isLoading: isLoading,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange: setRowSelectionModel,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    manualFiltering: true,
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // detail panel
    renderDetailPanel: ({ row }) => <ClassifierDetailPanel classifier={row.original} />,
    muiExpandButtonProps: ({ row, table }) => ({
      onClick: () => table.setExpanded({ [row.id]: !row.getIsExpanded() }), //set only this row to be expanded
    }),
    // row actions
    enableRowActions: true,
    renderRowActions: ({ row }) => (
      <Box>
        <Button onClick={() => handleEvaluateModel(row.original.id, row.original.type)}>Eval</Button>
        <Button onClick={() => handleInferenceModel(row.original.id, row.original.type)}>Infer</Button>
      </Box>
    ),
    // sorting
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    // column visibility
    enableHiding: false,
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
  });

  return (
    <Box {...props}>
      <DATSToolbar variant="dense">
        {selectedRows.length > 0 ? (
          <>
            <Tooltip
              title={
                <>
                  <Typography>Delete classifier:</Typography>
                  This action will permanently delete the selected classifiers.
                </>
              }
              placement="top-start"
            >
              <span>
                <Button onClick={() => handleDeleteClassifier()}>Delete classifier</Button>
              </span>
            </Tooltip>
          </>
        ) : (
          <Tooltip
            title={
              <>
                <Typography>Train classifier:</Typography>A dialog will guide you through classifier training.
              </>
            }
            placement="top-start"
          >
            <span>
              <Button onClick={(e) => setAnchorEl(e.currentTarget)}>Train classifier</Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              >
                {Object.values(ClassifierModel).map((modelType) => (
                  <MenuItem key={modelType} onClick={() => handleTrainClassifier(modelType)}>
                    {modelType} classifier
                  </MenuItem>
                ))}
              </Menu>
            </span>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <MRT_ToggleDensePaddingButton table={table} />
        <MRT_LinearProgressBar isTopToolbar={true} table={table} />
        <Tooltip title="Refresh table">
          <span>
            <IconButton loading={isFetching || isLoading} onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </DATSToolbar>
      <MRT_ToolbarAlertBanner stackAlertBanner table={table} />
      <CardContainer sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MRT_TableContainer table={table} style={{ flexGrow: 1 }} />
        <Box sx={{ p: 1 }}>
          <Divider />
          <Stack direction={"row"} spacing={1} alignItems="center" width="100%">
            <Typography>Fetched {data?.length} classifiers.</Typography>
          </Stack>
        </Box>
      </CardContainer>
    </Box>
  );
}

export default ClassifierTable;
