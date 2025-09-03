import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Card, IconButton, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_LinearProgressBar,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_TableContainer,
  MRT_TableOptions,
  MRT_ToggleDensePaddingButton,
  MRT_ToolbarAlertBanner,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useRef, useState } from "react";
import ClassifierHooks from "../../api/ClassifierHooks.ts";
import { ClassifierModel } from "../../api/openapi/models/ClassifierModel.ts";
import { ClassifierRead } from "../../api/openapi/models/ClassifierRead.ts";
import { ClassifierTask } from "../../api/openapi/models/ClassifierTask.ts";
import CodeRenderer from "../../components/Code/CodeRenderer.tsx";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import CardContainer from "../../components/MUI/CardContainer.tsx";
import DATSToolbar from "../../components/MUI/DATSToolbar.tsx";
import TagRenderer from "../../components/Tag/TagRenderer.tsx";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { dateToLocaleDate } from "../../utils/DateUtils.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import ClassifierDetails from "./ClassifierDetails.tsx";

interface ClassifierTableProps {
  projectId: number;
}

const columns: MRT_ColumnDef<ClassifierRead>[] = [
  {
    id: "name",
    header: "Name",
    size: 400,
    accessorFn: (row) => row.name,
    enableEditing: true,
  },
  {
    id: "type",
    header: "Type",
    accessorFn: (row) => row.type,
    enableEditing: false,
  },
  {
    id: "classes",
    header: "Classes",
    accessorFn: (row) => row.class_ids,
    enableSorting: false,
    Cell: ({ row }) => {
      if (row.original.type === ClassifierModel.DOCUMENT) {
        return (
          <>
            {row.original.class_ids.map((tagId) => (
              <TagRenderer key={tagId} tag={tagId} />
            ))}
          </>
        );
      } else {
        return (
          <>
            {row.original.class_ids.map((codeId) => (
              <CodeRenderer key={codeId} code={codeId} />
            ))}
          </>
        );
      }
    },
    enableEditing: false,
  },
  {
    id: "created",
    header: "Created",
    accessorFn: (row) => row.created,
    Cell: ({ row }) => dateToLocaleDate(row.original.created).toLocaleString(),
    enableEditing: false,
  },
];

function ClassifierTable({ projectId }: ClassifierTableProps) {
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

  // rename
  const { mutate: updateClassifier, isPending: isRenamePending } = ClassifierHooks.useUpdateClassifier();
  const handleRenameClassifier: MRT_TableOptions<ClassifierRead>["onEditingRowSave"] = ({ row, values, table }) => {
    if (!values.name || values.name === row.original.name) {
      table.setEditingRow(null); //exit editing mode
      return; // not provided OR no change
    }
    updateClassifier(
      {
        classifierId: row.original.id,
        requestBody: {
          name: values.name,
        },
      },
      {
        onSuccess() {
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

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

  const handleEvaluateModel = (classifierId: number, modelType: ClassifierModel, classIds: number[]) => {
    dispatch(
      CRUDDialogActions.openClassifierDialog({
        projectId: projectId,
        classifierModel: modelType,
        classifierId: classifierId,
        classifierTask: ClassifierTask.EVALUATION,
        classifierClassIds: classIds,
        classifierStep: 0,
      }),
    );
  };

  const handleInferenceModel = (classifierId: number, modelType: ClassifierModel, classIds: number[]) => {
    dispatch(
      CRUDDialogActions.openClassifierDialog({
        projectId: projectId,
        classifierModel: modelType,
        classifierId: classifierId,
        classifierTask: ClassifierTask.INFERENCE,
        classifierClassIds: classIds,
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
      isSaving: isRenamePending,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    // edit analysis inline
    enableEditing: true,
    editDisplayMode: "row", // ('modal', 'cell', 'table', and 'custom' are also available)
    onEditingRowSave: handleRenameClassifier,
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
    renderDetailPanel: ({ row }) => <ClassifierDetails classifier={row.original} />,
    muiExpandButtonProps: ({ row, table }) => ({
      onClick: () => table.setExpanded({ [row.id]: !row.getIsExpanded() }), //set only this row to be expanded
    }),
    // row actions
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", flexWrap: "nowrap", gap: "8px" }}>
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
        <Button onClick={() => handleEvaluateModel(row.original.id, row.original.type, row.original.class_ids)}>
          Eval
        </Button>
        <Button onClick={() => handleInferenceModel(row.original.id, row.original.type, row.original.class_ids)}>
          Infer
        </Button>
      </Box>
    ),
    displayColumnDefOptions: {
      "mrt-row-actions": {
        size: 240, //make actions column wider
      },
    },
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
    <Card className="h100 myFlexContainer" variant="outlined">
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
      <CardContainer sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <MRT_TableContainer table={table} style={{ flexGrow: 1 }} />
      </CardContainer>
    </Card>
  );
}

export default ClassifierTable;
