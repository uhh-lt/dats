import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef, type UIEvent } from "react";
import { useParams } from "react-router-dom";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { WordFrequencyResult } from "../../../api/openapi/models/WordFrequencyResult.ts";
import { WordFrequencyStat } from "../../../api/openapi/models/WordFrequencyStat.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import WordFrequencyFilterDialog from "./WordFrequencyFilterDialog.tsx";
import { useInitWordFrequencyFilterSlice } from "./useInitWordFrequencyFilterSlice.ts";
import { WordFrequencyActions } from "./wordFrequencySlice.ts";

const fetchSize = 20;

function WordFrequencyTable() {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const rowSelectionModel = useAppSelector((state) => state.wordFrequency.rowSelectionModel);
  const sortingModel = useAppSelector((state) => state.wordFrequency.sortingModel);
  const columnVisibilityModel = useAppSelector((state) => state.wordFrequency.columnVisibilityModel);
  const dispatch = useAppDispatch();

  // filtering
  const filter = useAppSelector((state) => state.wordFrequency.filter["root"]);

  // virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitWordFrequencyFilterSlice({ projectId });
  const columns: MRT_ColumnDef<WordFrequencyStat>[] = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result: Array<MRT_ColumnDef<WordFrequencyStat> | null> = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<WordFrequencyStat> = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case WordFrequencyColumns.WF_WORD:
          return {
            ...colDef,
            accessorFn(originalRow) {
              return originalRow.word;
            },
          };
        case WordFrequencyColumns.WF_WORD_FREQUENCY:
          return {
            ...colDef,
            accessorFn(originalRow) {
              return originalRow.count;
            },
          };
        case WordFrequencyColumns.WF_WORD_PERCENT:
          return {
            ...colDef,
            accessorFn(originalRow) {
              return (originalRow.word_percent * 100).toFixed(2);
            },
          };
        case WordFrequencyColumns.WF_SOURCE_DOCUMENT_FREQUENCY:
          return {
            ...colDef,
            accessorFn(originalRow) {
              return originalRow.sdocs;
            },
          };
        case WordFrequencyColumns.WF_SOURCE_DOCUMENT_PERCENT:
          return {
            ...colDef,
            accessorFn(originalRow) {
              return (originalRow.sdocs_percent * 100).toFixed(2);
            },
          };
        default:
          return null;
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<WordFrequencyStat>[];
  }, [tableInfo, user]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<WordFrequencyResult>({
    queryKey: [
      "wordfrequency-table-data",
      projectId,
      filter, //refetch when columnFilters changes
      sortingModel, //refetch when sorting changes
    ],
    queryFn: ({ pageParam }) =>
      AnalysisService.wordFrequencyAnalysis({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<WordFrequencyColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as WordFrequencyColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });
  // create a flat array of data mapped from id to row
  const flatData = useMemo(() => data?.pages.flatMap((page) => page.word_frequencies) ?? [], [data]);
  const totalDBRowCount = data?.pages?.[0]?.total_results ?? 0;
  const totalFetched = flatData.length;

  // infinite scrolling
  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        // once the user has scrolled within 400px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 400 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount],
  );
  // scroll to top of table when userId, sorting or filters change
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel]);
  // a check on mount to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  // table
  const table = useMaterialReactTable({
    data: flatData,
    columns: columns,
    getRowId: (row) => row.word,
    // state
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const newRowSelectionModel = updater instanceof Function ? updater(rowSelectionModel) : updater;
      dispatch(WordFrequencyActions.onSelectionModelChange(newRowSelectionModel));
    },
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
    onSortingChange: (updater) => {
      const newSortingModel = updater instanceof Function ? updater(sortingModel) : updater;
      dispatch(WordFrequencyActions.onSortingModelChange(newSortingModel));
    },
    // column visiblility
    onColumnVisibilityChange: (updater) => {
      const newVisibilityModel = updater instanceof Function ? updater(columnVisibilityModel) : updater;
      dispatch(WordFrequencyActions.onColumnVisibilityModelChange(newVisibilityModel));
    },
    // mui components
    muiTablePaperProps: {
      elevation: 4,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: (event: UIEvent<HTMLDivElement>) => fetchMoreOnBottomReached(event.target as HTMLDivElement), //add an event listener to the table container element
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // toolbar
    positionToolbarAlertBanner: "head-overlay",
    renderBottomToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalDBRowCount} unique words (from {data?.pages?.[0]?.sdocs_total ?? 0} documents
          with {data?.pages?.[0]?.words_total ?? 0} words).
        </Typography>
      </Stack>
    ),
    renderTopToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <WordFrequencyFilterDialog anchorEl={tableContainerRef.current} />
      </Stack>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <Tooltip title={"Export word frequencies"}>
          <span>
            <IconButton disabled>
              <SaveAltIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default WordFrequencyTable;
