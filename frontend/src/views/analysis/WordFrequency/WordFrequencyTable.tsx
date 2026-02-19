import { Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useCallback, useEffect, useMemo, useRef, type UIEvent } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { WordFrequencyResult } from "../../../api/openapi/models/WordFrequencyResult.ts";
import { WordFrequencyStat } from "../../../api/openapi/models/WordFrequencyStat.ts";
import { WordFrequencyService } from "../../../api/openapi/services/WordFrequencyService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import ContentContentLayout from "../../../layouts/ContentLayouts/ContentContentLayout.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import ExportWordFrequencyButton from "./ExportWordFrequencyButton.tsx";
import WordCloud from "./WordCloud.tsx";
import { useInitWordFrequencyFilterSlice } from "./useInitWordFrequencyFilterSlice.ts";
import { WordFrequencyActions } from "./wordFrequencySlice.ts";

const filterStateSelector = (state: RootState) => state.wordFrequency;
const filterName = "root";
const fetchSize = 20;
const flatMapData = (page: WordFrequencyResult) => page.word_frequencies;

interface WordFrequencyTableProps {
  projectId: number;
}

function WordFrequencyTable({ projectId }: WordFrequencyTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.wordFrequency.rowSelectionModel,
    WordFrequencyActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.wordFrequency.sortingModel,
    WordFrequencyActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.wordFrequency.columnVisibilityModel,
    WordFrequencyActions.onColumnVisibilityChange,
  );

  // filtering
  const filter = useAppSelector((state) => state.wordFrequency.filter["root"]);

  // virtualization
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
      QueryKey.WORD_FREQUENCY_TABLE,
      projectId,
      filter, //refetch when columnFilters changes
      sortingModel, //refetch when sorting changes
    ],
    queryFn: ({ pageParam }) =>
      WordFrequencyService.wordFrequencyAnalysis({
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
  const handleTableScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => fetchMoreOnScroll(event.target as HTMLDivElement),
    [fetchMoreOnScroll],
  );

  // render
  const renderTopLeftToolbarContent = useCallback(
    () => (
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <ReduxFilterDialog
          anchorEl={tableContainerRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={WordFrequencyActions}
        />
      </Stack>
    ),
    [],
  );
  const renderBottomToolbarContent = useCallback(
    () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalResults} unique words (from {data?.pages?.[0]?.sdocs_total ?? 0} documents
          with {data?.pages?.[0]?.words_total ?? 0} words).
        </Typography>
      </Stack>
    ),
    [totalFetched, totalResults, data],
  );
  const renderTopRightToolbarContent = useCallback(
    ({ table }: { table: MRT_TableInstance<WordFrequencyStat> }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <ExportWordFrequencyButton filter={filter as MyFilter<WordFrequencyColumns>} />
      </Stack>
    ),
    [filter],
  );

  // table
  const table = useMaterialReactTable<WordFrequencyStat>({
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
    // column visiblility
    onColumnVisibilityChange: setColumnVisibilityModel,
    // mui components
    muiTablePaperProps: {
      elevation: 4,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: handleTableScroll,
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    muiTopToolbarProps: {
      sx: {
        px: 2,
        py: 0,
        minHeight: 48,
      },
    },
    // toolbar
    positionToolbarAlertBanner: "head-overlay",
    renderTopToolbarCustomActions: renderTopLeftToolbarContent,
    renderToolbarInternalActions: renderTopRightToolbarContent,
    renderBottomToolbarCustomActions: renderBottomToolbarContent,
  });

  return (
    <>
      <ContentContentLayout
        leftContent={<MaterialReactTable table={table} />}
        rightContent={
          <WordCloud width={800} height={600} words={flatData.filter((word) => rowSelectionModel[word.word])} />
        }
      />
    </>
  );
}

export default memo(WordFrequencyTable);
