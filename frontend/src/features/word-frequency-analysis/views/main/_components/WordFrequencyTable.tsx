import { StringOperator } from "@api/models/StringOperator";
import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { WordFrequencyResult } from "@api/models/WordFrequencyResult";
import { WordFrequencyStat } from "@api/models/WordFrequencyStat";
import { ContentContentLayout } from "@components/content-layouts";
import { FilterTable, MyFilter } from "@core/filter";
import { useURLConnector } from "@hooks/useURLConnector";
import { RootState } from "@store/store";
import { useReduxConnector } from "@store/storeHooks";
import { InfiniteData } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useMemo } from "react";
import { useInitWordFrequencySlice } from "../../../_hooks/useInitWordFrequencySlice";
import { WordFrequencyActions } from "../../../store/wordFrequencySlice";
import { WordFrequencyRouteAPI } from "../_hooks/wordFrequencyRouteAPI";
import { WordCloud } from "./WordCloud";
import { WordFrequencyTableToolbarBottom } from "./WordFrequencyTableToolbarBottom";
import { WordFrequencyTableToolbarLeft } from "./WordFrequencyTableToolbarLeft";
import { WordFrequencyTableToolbarProps } from "./WordFrequencyTableToolbarProps";
import { WordFrequencyTableToolbarRight } from "./WordFrequencyTableToolbarRight";

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
    const [, onFetchSizeChange] = useURLConnector(WordFrequencyRouteAPI, "fetchSize");

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

    const flatData = useMemo(() => searchData.pages.flatMap(flatMapData), [searchData]);
    const sdocsTotal = searchData.pages[0]?.sdocs_total ?? 0;
    const wordsTotal = searchData.pages[0]?.words_total ?? 0;

    return (
      <ContentContentLayout
        leftContent={
          <FilterTable<WordFrequencyStat, WordFrequencyTableToolbarProps, WordFrequencyResult>
            name="unique words"
            columns={columns}
            getRowId={(row) => row.word}
            data={searchData}
            fetchNextPage={onFetchNextPage}
            flatMapData={flatMapData}
            isLoading={isLoading || columns.length === 0}
            isError={isError}
            isFetching={isFetching}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionChange={setRowSelectionModel}
            sortingModel={sortingModel}
            onSortingChange={setSortingModel}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityChange={setColumnVisibilityModel}
            onFetchSizeChange={onFetchSizeChange}
            positionToolbarAlertBanner="head-overlay"
            renderTopLeftToolbar={WordFrequencyTableToolbarLeft}
            renderTopRightToolbar={WordFrequencyTableToolbarRight}
            renderBottomToolbar={WordFrequencyTableToolbarBottom}
            toolbarExtraProps={{
              routeApi: WordFrequencyRouteAPI,
              defaultFilterExpression,
              column2InfoSelector,
              filter,
              sdocsTotal,
              wordsTotal,
            }}
            muiTopToolbarProps={{
              sx: {
                px: 2,
                py: 0,
                minHeight: 48,
              },
            }}
          />
        }
        rightContent={
          <WordCloud width={800} height={600} words={flatData.filter((word) => rowSelectionModel[word.word])} />
        }
      />
    );
  },
);
