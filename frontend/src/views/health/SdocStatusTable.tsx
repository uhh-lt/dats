import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Box, Button, Divider, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_LinearProgressBar,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  MRT_ToolbarAlertBanner,
  useMaterialReactTable,
} from "material-react-table";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { SdocHealthResult } from "../../api/openapi/models/SdocHealthResult.ts";
import { SDocStatus } from "../../api/openapi/models/SDocStatus.ts";
import { SdocStatusRow } from "../../api/openapi/models/SdocStatusRow.ts";
import { SortDirection } from "../../api/openapi/models/SortDirection.ts";
import { DocprocessingService } from "../../api/openapi/services/DocprocessingService.ts";
import { QueryKey } from "../../api/QueryKey.ts";
import CardContainer from "../../components/MUI/CardContainer.tsx";
import DATSToolbar from "../../components/MUI/DATSToolbar.tsx";
import { useTableInfiniteScroll } from "../../utils/useTableInfiniteScroll.ts";

const sdocStatus2Icon: Record<SDocStatus, JSX.Element> = {
  [SDocStatus["_-100"]]: <ErrorOutlineIcon sx={{ color: "error.main" }} />,
  [SDocStatus._0]: <HourglassTopOutlinedIcon sx={{ color: "primary.main" }} />,
  [SDocStatus._1]: <TaskAltIcon sx={{ color: "success.main" }} />,
};

interface SdocStatusTableProps {
  doctype: DocType;
  projectId: number;
}

const flatMapData = (page: SdocHealthResult) => page.data;

function SdocStatusTable({ doctype, projectId }: SdocStatusTableProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [fetchSize, setFetchSize] = useState(20);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // computed
  const selectedRows = useMemo(() => {
    return Object.keys(rowSelectionModel)
      .filter((key) => rowSelectionModel[key])
      .map((key) => parseInt(key))
      .filter((id) => !isNaN(id));
  }, [rowSelectionModel]);

  // actions
  const handleRetry = useCallback(() => {
    console.log("Retrying...");
  }, []);

  const handleRecompute = useCallback((step: string) => {
    console.log(`Recomputing step ${step}...`);
    setAnchorEl(null);
  }, []);

  // table columns
  const tableColumnInfo = useQuery({
    queryKey: [QueryKey.SDOC_HEALTH_TABLE_COLUMNS, doctype],
    queryFn: () => DocprocessingService.getSearchColumnsByDoctype({ doctype }),
    staleTime: Infinity,
  });
  const columns: MRT_ColumnDef<SdocStatusRow>[] = useMemo(() => {
    if (!tableColumnInfo.data) return [];
    const result: MRT_ColumnDef<SdocStatusRow>[] = tableColumnInfo.data.reduce(
      (prev, current) => {
        prev.push({
          id: current,
          header: current,
          size: 200,
          accessorFn: (row) => row.status[current],
          Cell: ({ row }) => sdocStatus2Icon[row.original.status[current]] ?? null,
        });
        return prev;
      },
      [
        {
          id: "filename",
          header: "Filename",
          size: 400,
          accessorFn: (row) => row.filename,
        },
      ],
    );
    return result;
  }, [tableColumnInfo.data]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading, refetch } = useInfiniteQuery<SdocHealthResult>({
    queryKey: [
      QueryKey.SDOC_HEALTH_TABLE,
      projectId,
      doctype,
      sortingModel, //refetch when sorting changes
      fetchSize,
    ],
    queryFn: ({ pageParam }) =>
      DocprocessingService.searchSdocHealth({
        projId: projectId!,
        doctype: doctype,
        requestBody: sortingModel.map((sort) => ({
          column: sort.id,
          direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
        })),
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    enabled: !!projectId,
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });

  // infinite scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { flatData, totalResults, totalFetched, fetchMoreOnScroll } = useTableInfiniteScroll({
    tableContainerRef,
    data,
    isFetching,
    fetchNextPage,
    flatMapData,
  });

  // infinite scrolling reset:
  // scroll to top of table when sorting changes
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel]);

  // Table event handlers
  const handleTableScroll: React.UIEventHandler<HTMLDivElement> = useCallback(
    (event) => fetchMoreOnScroll(event.target as HTMLDivElement),
    [fetchMoreOnScroll],
  );

  // fetch all
  const handleFetchAll = useCallback(() => {
    setFetchSize(totalResults);
  }, [setFetchSize, totalResults]);

  // table
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);
  const table = useMaterialReactTable<SdocStatusRow>({
    data: flatData,
    columns: columns,
    getRowId: (row) => `${row.sdoc_id}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      isLoading: isLoading || columns.length === 0,
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
    // sorting
    manualSorting: true,
    onSortingChange: setSortingModel,
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    // column visibility
    enableHiding: false,
    // mui components
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DATSToolbar variant="dense">
        {selectedRows.length > 0 && (
          <>
            <Tooltip
              title={
                <>
                  <Typography>Retry failed steps:</Typography>
                  This action runs all <u>failed processing steps</u> again for the selected documents (if any)
                </>
              }
              placement="top-start"
            >
              <span>
                <Button onClick={() => handleRetry()}>Retry</Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                <>
                  <Typography>Recompute step:</Typography>
                  After selecting a step, this action <u>recomputes</u> it for the selected documents
                </>
              }
              placement="top-start"
            >
              <span>
                <Button onClick={(e) => setAnchorEl(e.currentTarget)}>Recompute</Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                >
                  {tableColumnInfo.data?.map((step) => (
                    <MenuItem key={step} onClick={() => handleRecompute(step)}>
                      {step}
                    </MenuItem>
                  ))}
                </Menu>
              </span>
            </Tooltip>
          </>
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
        <MRT_TableContainer
          table={table}
          ref={tableContainerRef}
          style={{ flexGrow: 1 }}
          onScroll={handleTableScroll}
        />
        <Box sx={{ p: 1 }}>
          <Divider />
          <Stack direction={"row"} spacing={1} alignItems="center" width="100%">
            <Typography>
              Fetched {totalFetched} of {totalResults} total documents.
            </Typography>
            <Button size="small" onClick={handleFetchAll}>
              Fetch All
            </Button>
          </Stack>
        </Box>
      </CardContainer>
    </Box>
  );
}

export default SdocStatusTable;
