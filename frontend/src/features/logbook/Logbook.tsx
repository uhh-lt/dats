import { MemoTable } from "@core/memo";
import { getRouteApi } from "@tanstack/react-router";
import { useReduxConnector } from "../../hooks/useReduxConnector.ts";
import { ContentContentLayout } from "../../layouts/ContentLayouts/ContentContentLayout.tsx";
import { LogbookEditor } from "./LogbookEditor.tsx";
import { LogbookActions } from "./logbookSlice.ts";

const filterName = "logbook";
const routeApi = getRouteApi("/_auth/project/$projectId/logbook");

export function Logbook() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.logbook.rowSelectionModel,
    LogbookActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.logbook.sortingModel,
    LogbookActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.logbook.columnVisibilityModel,
    LogbookActions.onColumnVisibilityChange,
  );
  const [fetchSize, setFetchSize] = useReduxConnector(
    (state) => state.logbook.fetchSize,
    LogbookActions.onFetchSizeChange,
  );

  return (
    <ContentContentLayout
      leftContent={
        <MemoTable
          projectId={projectId}
          filterName={filterName}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          sortingModel={sortingModel}
          onSortingChange={setSortingModel}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityChange={setColumnVisibilityModel}
          fetchSize={fetchSize}
          onFetchSizeChange={setFetchSize}
        />
      }
      rightContent={<LogbookEditor projectId={projectId} />}
    />
  );
}
