import { CircularProgress, Portal } from "@mui/material";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import TableHooks from "../../../api/TableHooks.ts";
import EditableTypography from "../../../components/EditableTypography.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import TableViewContent from "./TableViewContent.tsx";

function TableView() {
  // global client state
  const appBarContainerRef = useContext(AppBarContext);
  const urlParams = useParams() as { projectId: string; tableId: string };
  const projectId = parseInt(urlParams.projectId);
  const tableId = parseInt(urlParams.tableId);

  // global server state
  const updateTableMutation = TableHooks.useUpdateTable();
  const table = TableHooks.useGetTable(tableId);

  const handleChange = (value: string) => {
    if (!table.data || table.data.title === value) return;

    updateTableMutation.mutate({
      analysisTableId: table.data.id,
      requestBody: {
        title: value,
        table_type: table.data.table_type,
        content: JSON.stringify(table.data.content),
      },
    });
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <EditableTypography
          value={table.data?.title || "Loading"}
          onChange={handleChange}
          variant="h6"
          whiteColor={true}
        />
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
