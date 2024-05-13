import { Card, CardContent, CardHeader } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { WordFrequencyStat } from "../../../api/openapi/models/WordFrequencyStat.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { useInitWordFrequencyFilterSlice } from "./useInitWordFrequencyFilterSlice.ts";
import { useWordFrequencyQuery } from "./useWordFrequencyQuery.ts";
import { WordFrequencyActions } from "./wordFrequencySlice.ts";

interface WordFrequencyTableProps {
  tableContainerRef: React.RefObject<HTMLDivElement>;
}

function WordFrequencyTable({ tableContainerRef }: WordFrequencyTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const paginationModel = useAppSelector((state) => state.wordFrequency.paginationModel);
  const rowSelectionModel = useAppSelector((state) => state.wordFrequency.rowSelectionModel);
  const sortingModel = useAppSelector((state) => state.wordFrequency.sortingModel);
  const dispatch = useAppDispatch();

  // custom hooks (query)
  const wordFrequency = useWordFrequencyQuery(projectId);
  const tableInfo = useInitWordFrequencyFilterSlice({ projectId });

  // computed
  const columns: MRT_ColumnDef<WordFrequencyStat>[] = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result: Array<MRT_ColumnDef<WordFrequencyStat> | null> = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<WordFrequencyStat> = {
        id: column.column.toString(),
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
            // flex: 2,
          };
        case WordFrequencyColumns.WF_WORD_FREQUENCY:
          return {
            ...colDef,
            // flex: 2,
            accessorFn(originalRow) {
              return originalRow.count;
            },
          };
        case WordFrequencyColumns.WF_WORD_PERCENT:
          return {
            ...colDef,
            // flex: 1,
            accessorFn(originalRow) {
              return (originalRow.word_percent * 100).toFixed(2);
            },
          };
        case WordFrequencyColumns.WF_SOURCE_DOCUMENT_FREQUENCY:
          return {
            ...colDef,
            // flex: 2,
            accessorFn(originalRow) {
              return originalRow.sdocs;
            },
          };
        case WordFrequencyColumns.WF_SOURCE_DOCUMENT_PERCENT:
          return {
            ...colDef,
            // flex: 2,
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

  // table
  // if (wordFrequency.isError) {
  //   tableContent = (
  //     <Typography variant="body1" color="inherit" component="div">
  //       {wordFrequency.error?.message}
  //     </Typography>
  //   );
  // }
  const table = useMaterialReactTable({
    // style={{ border: "none" }}
    // disableColumnFilter
    // checkboxSelection
    // autoPageSize
    // keepNonExistentRowsSelected
    data: wordFrequency.data?.word_frequencies || [],
    columns: columns,
    getRowId: (row) => row.word,
    enableColumnFilters: false,
    // state
    state: {
      rowSelection: rowSelectionModel,
      pagination: paginationModel,
      sorting: sortingModel,
      isLoading: wordFrequency.isLoading,
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange: (rowSelectionUpdater) => {
      let newRowSelectionModel: MRT_RowSelectionState;
      if (typeof rowSelectionUpdater === "function") {
        newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
      } else {
        newRowSelectionModel = rowSelectionUpdater;
      }
      dispatch(WordFrequencyActions.onSelectionModelChange(newRowSelectionModel));
    },
    // pagination
    rowCount: wordFrequency.data?.total_results || 0,
    onPaginationChange: (paginationUpdater) => {
      let newPaginationModel: MRT_PaginationState;
      if (typeof paginationUpdater === "function") {
        newPaginationModel = paginationUpdater(paginationModel);
      } else {
        newPaginationModel = paginationUpdater;
      }
      dispatch(WordFrequencyActions.onPaginationModelChange(newPaginationModel));
    },
    // sorting
    manualSorting: true,
    onSortingChange: (sortingUpdater) => {
      let newSortingModel: MRT_SortingState;
      if (typeof sortingUpdater === "function") {
        newSortingModel = sortingUpdater(sortingModel);
      } else {
        newSortingModel = sortingUpdater;
      }
      dispatch(WordFrequencyActions.onSortingModelChange(newSortingModel));
    },
    // column hiding: hide metadata columns by default
    initialState: {
      columnVisibility: columns.reduce((acc, column) => {
        if (!column.id) return acc;
        // this is a normal column
        if (isNaN(parseInt(column.id))) {
          return acc;
          // this is a metadata column
        } else {
          return {
            ...acc,
            [column.id]: false,
          };
        }
      }, {}),
    },
  });

  return (
    <Card sx={{ width: "100%" }} elevation={2} className="myFlexFillAllContainer myFlexContainer h100">
      <CardHeader
        title="Word Frequencies"
        subheader={
          wordFrequency.isSuccess &&
          `From ${wordFrequency.data.sdocs_total} documents (${wordFrequency.data.words_total} words)`
        }
      />
      <CardContent className="myFlexFillAllContainer h100" style={{ padding: 0 }}>
        <div className="h100" style={{ width: "100%" }} ref={tableContainerRef}>
          <MaterialReactTable table={table} />
        </div>
      </CardContent>
    </Card>
  );
}

export default WordFrequencyTable;
