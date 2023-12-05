import CancelIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Card, CardContent, CardHeader, Container, Portal, Typography } from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
} from "@mui/x-data-grid";
import { useCallback, useContext, useState } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import WhiteboardHooks, { Whiteboard, WhiteboardGraph } from "../../api/WhiteboardHooks";
import { useAuth } from "../../auth/AuthProvider";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { dateToLocaleString } from "../../utils/DateUtils";
import CreateWhiteboardCard from "./CreateWhiteboardCard";
import ConfirmationAPI from "../../features/ConfirmationDialog/ConfirmationAPI";

function WhiteboardDashboard() {
  const appBarContainerRef = useContext(AppBarContext);
  const navigate = useNavigate();

  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const projectWhiteboards = WhiteboardHooks.useGetProjectWhiteboards(projectId);

  // local client state
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  // mutations
  const createWhiteboard = WhiteboardHooks.useCreateWhiteboard();
  const deleteWhiteboard = WhiteboardHooks.useDeleteWhiteboard();
  const updateWhiteboard = WhiteboardHooks.useUpdateWhiteboard();

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID" },
    {
      field: "title",
      headerName: "Name",
      flex: 1,
      editable: true,
    },
    {
      field: "updated",
      headerName: "Last modified",
      flex: 0.5,
      valueGetter: (params) => dateToLocaleString(params.value as string),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              sx={{
                color: "primary.main",
              }}
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
          <GridActionsCellItem
            icon={<ContentCopyIcon />}
            label="Duplicate"
            onClick={handleDuplicateWhiteboard(id as number)}
            color="inherit"
          />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} color="inherit" />,
        ];
      },
    },
  ];

  // CRUD whiteboard actions
  const handleCreateWhiteboard = (title: string) => {
    if (!user?.id) return;

    const content: WhiteboardGraph = { nodes: [], edges: [] };
    createWhiteboard.mutate(
      {
        requestBody: {
          project_id: projectId,
          user_id: user.id,
          title: title,
          content: JSON.stringify(content),
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Created new whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDuplicateWhiteboard = useCallback(
    (id: number) => () => {
      if (!user?.id || !projectWhiteboards.data) return;

      const whiteboard = projectWhiteboards.data.find((whiteboard) => whiteboard.id === id);
      if (!whiteboard) return;

      const mutation = createWhiteboard.mutate;
      mutation(
        {
          requestBody: {
            project_id: projectId,
            user_id: user.id,
            title: whiteboard.title + " (copy)",
            content: JSON.stringify(whiteboard.content),
          },
        },
        {
          onSuccess(data, variables, context) {
            SnackbarAPI.openSnackbar({
              text: `Duplicated whiteboard '${whiteboard.title}'`,
              severity: "success",
            });
          },
        },
      );
    },
    [createWhiteboard.mutate, projectId, user, projectWhiteboards.data],
  );

  const handleDeleteClick = (id: GridRowId) => () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the Whiteboard ${id}? This action cannot be undone!`,
      onAccept: () => {
        deleteWhiteboard.mutate(
          {
            whiteboardId: id as number,
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: `Deleted whiteboard '${data.title}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const processRowUpdate = (newRow: GridRowModel<Whiteboard>) => {
    updateWhiteboard.mutate(
      {
        whiteboardId: newRow.id,
        requestBody: {
          title: newRow.title,
          content: JSON.stringify(newRow.content),
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      },
    );
    return newRow;
  };

  // UI actions
  const handleRowClick: GridEventListener<"rowClick"> = (params, event) => {
    if (params.id in rowModesModel && rowModesModel[params.id].mode === GridRowModes.Edit) return;
    navigate(`./${params.id}`);
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const handleRowEditStop: GridEventListener<"rowEditStop"> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Whiteboard Dashboard
        </Typography>
      </Portal>
      <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
        <Card
          sx={{ width: "100%", height: "50%", maxHeight: "400px", mb: 2 }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Create whiteboard" />
          <CardContent className="myFlexFillAllContainer">
            <Box height="100%" overflow="auto" whiteSpace="nowrap">
              <CreateWhiteboardCard
                title="Empty whiteboard"
                description="Create an empty whiteboard with no template"
                onClick={() => handleCreateWhiteboard("New Whiteboard")}
              />
              <CreateWhiteboardCard
                title="Code whiteboard"
                description="Create a whiteboard with all of your codes"
                onClick={() => handleCreateWhiteboard("New Code Whiteboard")}
              />
              <CreateWhiteboardCard
                title="Image whiteboard"
                description="Create a whiteboard with images"
                onClick={() => handleCreateWhiteboard("New Image Whiteboard")}
              />
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{ width: "100%", minHeight: "225.5px" }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Load whiteboard" />
          <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
            <div className="h100" style={{ width: "100%" }}>
              <DataGrid
                rows={projectWhiteboards.data || []}
                columns={columns}
                autoPageSize
                getRowId={(row) => row.id}
                onRowClick={handleRowClick}
                hideFooterSelectedRowCount
                style={{ border: "none" }}
                initialState={{
                  sorting: {
                    sortModel: [{ field: "updated", sort: "desc" }],
                  },
                }}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={(newRowModesModel) => setRowModesModel(newRowModesModel)}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
              />
            </div>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default WhiteboardDashboard;
