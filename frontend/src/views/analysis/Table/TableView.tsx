import { CircularProgress, Portal, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import TableHooks from "../../../api/TableHooks";
import TableViewContent from "./TableViewContent";
import { useContext } from "react";
import { AppBarContext } from "../../../layouts/TwoBarLayout";

function TableView() {
  // global client state
  const appBarContainerRef = useContext(AppBarContext);
  const urlParams = useParams() as { projectId: string; tableId: string };
  const projectId = parseInt(urlParams.projectId);
  const tableId = parseInt(urlParams.tableId);

  // global server state
  const table = TableHooks.useGetTable(tableId);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Table: {table.data?.title}
        </Typography>
      </Portal>
      {table.isSuccess ? (
        <TableViewContent key={`${projectId}-${tableId}`} table={table.data} />
      ) : table.isLoading ? (
        <CircularProgress />
      ) : table.isError ? (
        <div>ERROR: {table.error.message}</div>
      ) : null}
    </>
  );
}

export default TableView;
