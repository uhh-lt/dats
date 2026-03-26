import { StringOperator } from "@api/models/StringOperator";
import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { WordFrequencyResult } from "@api/models/WordFrequencyResult";
import { WordFrequencyStat } from "@api/models/WordFrequencyStat";
import { ContentContentLayout } from "@components/content-layouts";
import { MyFilter, URLFilterDialog } from "@core/filter";
import { useTableInfiniteScroll } from "@hooks/useTableInfiniteScroll";
import { useURLConnector } from "@hooks/useURLConnector";
import { Stack, Typography } from "@mui/material";
import { RootState } from "@store/store";
import { useReduxConnector } from "@store/storeHooks";
import { InfiniteData } from "@tanstack/react-query";
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
import { useInitWordFrequencySlice } from "../../../_hooks/useInitWordFrequencySlice";
import { WordFrequencyActions } from "../../../store/wordFrequencySlice";
import { WordFrequencyRouteAPI } from "../_hooks/wordFrequencyRouteAPI";
import { WordCloud } from "./WordCloud";
import { WordFrequencyExportButton } from "./WordFrequencyExportButton";

const filterName = "root";
const flatMapData = (page: WordFrequencyResult) => page.word_frequencies;
const defaultFilterExpression = {
  id: crypto.randomUUID(),
  column: WordFrequencyColumns.WF_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};
const column2InfoSelector = (state: RootState) => state.wordFrequency.column2Info;

interface WordFrequencyTableProps {
  projectId: number;
  searchData: InfiniteData<WordFrequencyResult>;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onFetchNextPage: () => void;
  filter: MyFilter<WordFrequencyColumns>;
  onSearchParameterChange?: () => void;
}

export const WordFrequencyTable = memo(
  ({ projectId, searchData, isError, isFetching, isLoading, onFetchNextPage, filter }: WordFrequencyTableProps) => {
    // redux table state
    const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
      (state) => state.wordFrequency.rowSelectionModel,
      WordFrequencyActions.onRowSelectionChange,
    );
    const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
      (state) => state.wordFrequency.columnVisibilityModel,
      WordFrequencyActions.onColumnVisibilityChange,
    );

    // url table state
    const [sortingModel, setSortingModel] = useURLConnector(WordFrequencyRouteAPI, "sortingModel");

    // virtualization
    const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

    // table columns
    const tableInfo = useInitWordFrequencySlice({ projectId });
    const columns: MRT_ColumnDef<WordFrequencyStat>[] = useMemo(() => {
      if (!tableInfo) return [];

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
    }, [tableInfo]);

    // infinite scrolling
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { flatData, totalResults, totalFetched, fetchMoreOnScroll } = useTableInfiniteScroll({
      tableContainerRef,
      data: searchData,
      isFetching,
      fetchNextPage: onFetchNextPage,
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
          <URLFilterDialog
            anchorEl={tableContainerRef.current}
            buttonProps={{ size: "small" }}
            filterName={filterName}
            routeApi={WordFrequencyRouteAPI}
            defaultFilterExpression={defaultFilterExpression}
            column2InfoSelector={column2InfoSelector}
          />
        </Stack>
      ),
      [],
    );
    const renderBottomToolbarContent = useCallback(
      () => (
        <Stack direction={"row"} spacing={1} alignItems="center">
          <Typography>
            Fetched {totalFetched} of {totalResults} unique words (from {searchData?.pages?.[0]?.sdocs_total ?? 0}{" "}
            documents with {searchData?.pages?.[0]?.words_total ?? 0} words).
          </Typography>
        </Stack>
      ),
      [totalFetched, totalResults, searchData],
    );
    const renderTopRightToolbarContent = useCallback(
      ({ table }: { table: MRT_TableInstance<WordFrequencyStat> }) => (
        <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
          <MRT_ShowHideColumnsButton table={table} />
          <MRT_ToggleDensePaddingButton table={table} />
          <WordFrequencyExportButton filter={filter} />
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
  },
);
