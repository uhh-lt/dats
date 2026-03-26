import { DocProcessingHooks } from "@api/hooks/DocProcessingHooks";
import { GeneralHooks } from "@api/hooks/GeneralHooks";
import { DocType } from "@api/models/DocType";
import { SdocHealthResult } from "@api/models/SdocHealthResult";
import { SDocStatus } from "@api/models/SDocStatus";
import { SdocStatusRow } from "@api/models/SdocStatusRow";
import { FilterTable } from "@core/filter";
import { useURLConnector } from "@hooks/useURLConnector";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Tooltip } from "@mui/material";
import { useReduxConnector } from "@store/storeHooks";
import { InfiniteData } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { ReactElement, useCallback, useMemo } from "react";
import { flatMapSdocHealthRows } from "../../../_api/healthQueryOptions";
import { HealthActions } from "../../../store/healthSlice";
import { HealthRouteAPI } from "../_hooks/healthRouteAPI";
import { HealthTableToolbarLeft } from "./HealthTableToolbarLeft";
import { HealthTableToolbarProps } from "./HealthTableToolbarProps";
import { HealthTableToolbarRight } from "./HealthTableToolbarRight";

const sdocStatus2Icon: Record<SDocStatus, ReactElement> = {
  [SDocStatus["_-100"]]: <ErrorOutlineIcon sx={{ color: "error.main" }} />,
  [SDocStatus._0]: <HourglassTopOutlinedIcon sx={{ color: "primary.main" }} />,
  [SDocStatus._1]: <TaskAltIcon sx={{ color: "success.main" }} />,
};

const sdocStatus2Text: Record<SDocStatus, string> = {
  [SDocStatus["_-100"]]: "Error",
  [SDocStatus._0]: "Waiting/In Progress",
  [SDocStatus._1]: "Completed",
};

interface SdocStatusTableProps {
  doctype: DocType;
  projectId: number;
  tableColumnInfo: string[];
  searchData: InfiniteData<SdocHealthResult>;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onFetchNextPage: () => void;
  onRefetch: () => void;
}

const flatMapData = (page: SdocHealthResult) => page.data;

export function SdocStatusTable(props: SdocStatusTableProps) {
  const availableLLMs = GeneralHooks.useGetAvailableLLMs();

  return (
    <>
      {availableLLMs.isError ? (
        <p>Error loading available LLMs: {availableLLMs.error.message}</p>
      ) : availableLLMs.isLoading ? (
        <p>Loading available LLMs...</p>
      ) : availableLLMs.isSuccess && availableLLMs.data.length === 0 ? (
        <p>No available LLMs found. Please contact the administrator.</p>
      ) : availableLLMs.isSuccess && availableLLMs.data.length > 0 ? (
        <SdocStatusTableContent availableLLMs={availableLLMs.data} {...props} />
      ) : null}
    </>
  );
}


function SdocStatusTableContent({
  availableLLMs,
  doctype,
  projectId,
  tableColumnInfo,
  searchData,
  isError,
  isFetching,
  isLoading,
  onFetchNextPage,
  onRefetch,
}: SdocStatusTableProps) {
  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.health.rowSelectionModel,
    HealthActions.onRowSelectionChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.health.columnVisibilityModel,
    HealthActions.onColumnVisibilityChange,
  );
  const [settings, setSettings] = useReduxConnector(
    (state) => state.health.processingSettings,
    HealthActions.onProcessingSettingsChange,
  );

  // url state for table query parameters
  const [sortingModel, setSortingModel] = useURLConnector(HealthRouteAPI, "sortingModel");
  const [, setFetchSize] = useURLConnector(HealthRouteAPI, "fetchSize");

  // computed
  const selectedRows = useMemo(() => {
    return Object.keys(rowSelectionModel)
      .filter((key) => rowSelectionModel[key])
      .map((key) => parseInt(key, 10))
      .filter((id) => !isNaN(id));
  }, [rowSelectionModel]);

  // actions
  const { mutate: retryDocProcessingJobs, isPending: isRetryPending } = DocProcessingHooks.useRetryDocProcessingJobs();
  const handleRetry = useCallback(() => {
    retryDocProcessingJobs({
      projId: projectId,
      doctype: doctype,
      requestBody: selectedRows,
    });
  }, [doctype, projectId, retryDocProcessingJobs, selectedRows]);

  const { mutate: recomputeDocProcessingJobs, isPending: isRecomputePending } =
    DocProcessingHooks.useRecomputeDocProcessingJobs();
  const handleRecompute = useCallback(
    (step: string) => {
      recomputeDocProcessingJobs({
        projId: projectId,
        processingStep: step,
        requestBody: {
          sdoc_ids: selectedRows,
          settings: settings,
        },
      });
    },
    [projectId, recomputeDocProcessingJobs, selectedRows, settings],
  );

  // table columns
  const columns: MRT_ColumnDef<SdocStatusRow>[] = useMemo(() => {
    if (!tableColumnInfo) return [];
    const result: MRT_ColumnDef<SdocStatusRow>[] = tableColumnInfo.reduce(
      (prev, current) => {
        prev.push({
          id: current,
          header: current,
          size: 200,
          accessorFn: (row) => row.status[current],
          Cell: ({ row }) => {
            const errorMsg = row.original.failed_job_status_msgs[current];
            const jobId = row.original.failed_job_uuids[current];
            return (
              <Tooltip
                title={
                  errorMsg && jobId ? (
                    <>
                      Error Message: {errorMsg}
                      <br />
                      Job ID: {jobId}
                    </>
                  ) : (
                    <>Status: {sdocStatus2Text[row.original.status[current]]}</>
                  )
                }
                placement="top-start"
              >
                {sdocStatus2Icon[row.original.status[current]] ?? null}
              </Tooltip>
            );
          },
        });
        return prev;
      },
      [
        {
          id: "name",
          header: "Name",
          size: 400,
          accessorFn: (row) => row.name,
        },
      ],
    );
    return result;
  }, [tableColumnInfo]);

  return (
    <FilterTable<SdocStatusRow, HealthTableToolbarProps, SdocHealthResult>
      name="documents"
      columns={columns}
      getRowId={(row) => `${row.sdoc_id}`}
      data={searchData}
      fetchNextPage={onFetchNextPage}
      flatMapData={flatMapSdocHealthRows}
      isLoading={isLoading || columns.length === 0}
      isError={isError}
      isFetching={isFetching}
      onFetchSizeChange={setFetchSize}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      renderTopLeftToolbar={HealthTableToolbarLeft}
      renderTopRightToolbar={HealthTableToolbarRight}
      toolbarExtraProps={{
        selectedRows,
        tableColumnInfo,
        settings,
        onChangeSettings: setSettings,
        isRetryPending,
        isRecomputePending,
        onRetry: handleRetry,
        onRecompute: handleRecompute,
        onRefetch,
        isRefreshing: isFetching || isLoading,
      }}
      enableColumnResizing
      columnResizeMode="onEnd"
      // enableHiding={false}
    />
  );
}
