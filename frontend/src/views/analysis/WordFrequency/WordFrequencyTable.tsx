import { Card, CardContent, CardHeader, CircularProgress, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { WordFrequencyColumns, WordFrequencyStat } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { useInitWordFrequencyFilterSlice } from "./useInitWordFrequencyFilterSlice";
import { useWordFrequencyQuery } from "./useWordFrequencyQuery";
import { WordFrequencyActions } from "./wordFrequencySlice";

interface WordFrequencyTableProps {
  onRowContextMenu: (event: React.MouseEvent<HTMLDivElement>, spanAnnotationId: number) => void;
  tableContainerRef: React.RefObject<HTMLDivElement>;
}

function WordFrequencyTable({ onRowContextMenu, tableContainerRef }: WordFrequencyTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const paginationModel = useAppSelector((state) => state.wordFrequency.paginationModel);
  const rowSelectionModel = useAppSelector((state) => state.wordFrequency.rowSelectionModel);
  const sortModel = useAppSelector((state) => state.wordFrequency.sortModel);
  const dispatch = useAppDispatch();

  // custom hooks (query)
  const wordFrequency = useWordFrequencyQuery(projectId);
  const tableInfo = useInitWordFrequencyFilterSlice({ projectId });

  // computed
  const columns: GridColDef<WordFrequencyStat>[] = useMemo(() => {
    if (!tableInfo.data || !user) return [];

    const result = tableInfo.data.map((column) => {
      const colDef = {
        field: column.column,
        headerName: column.label,
        sortable: column.sortable,
      } as GridColDef<WordFrequencyStat>;

      switch (column.column) {
        case WordFrequencyColumns.WF_WORD:
          return {
            ...colDef,
            flex: 2,
            valueGetter(params) {
              return params.row.word;
            },
          } as GridColDef<WordFrequencyStat>;
        case WordFrequencyColumns.WF_WORD_FREQUENCY:
          return {
            ...colDef,
            flex: 2,
            valueGetter(params) {
              return params.row.count;
            },
          } as GridColDef<WordFrequencyStat>;
        case WordFrequencyColumns.WF_WORD_PERCENT:
          return {
            ...colDef,
            flex: 1,
            valueGetter(params) {
              return (params.row.word_percent * 100).toFixed(2);
            },
          } as GridColDef<WordFrequencyStat>;
        case WordFrequencyColumns.WF_SOURCE_DOCUMENT_FREQUENCY:
          return {
            ...colDef,
            flex: 2,
            valueGetter(params) {
              return params.row.sdocs;
            },
          } as GridColDef<WordFrequencyStat>;
        case WordFrequencyColumns.WF_SOURCE_DOCUMENT_PERCENT:
          return {
            ...colDef,
            flex: 2,
            valueGetter(params) {
              return (params.row.sdocs_percent * 100).toFixed(2);
            },
          } as GridColDef<WordFrequencyStat>;
        default:
          return null;
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as GridColDef<WordFrequencyStat>[];
  }, [tableInfo.data, user]);

  let tableContent: JSX.Element;
  if (wordFrequency.isError) {
    tableContent = (
      <Typography variant="body1" color="inherit" component="div">
        {wordFrequency.error?.message}
      </Typography>
    );
  } else if (columns.length === 0) {
    tableContent = <CircularProgress />;
  } else {
    tableContent = (
      <DataGrid
        rows={wordFrequency.data?.word_frequencies || []}
        columns={columns}
        getRowId={(row) => row.word}
        style={{ border: "none" }}
        slotProps={{
          row: {
            onContextMenu: (event) => console.log(event),
          },
        }}
        disableColumnFilter
        // selection
        checkboxSelection
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={(selectionModel) =>
          dispatch(WordFrequencyActions.onSelectionModelChange(selectionModel as number[]))
        }
        // server side pagination
        autoPageSize
        paginationMode="server"
        rowCount={wordFrequency.data?.total_results || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={(model) => dispatch(WordFrequencyActions.onPaginationModelChange(model))}
        keepNonExistentRowsSelected
        loading={wordFrequency.isLoading || wordFrequency.isPreviousData}
        // sorting
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={(sortModel) => dispatch(WordFrequencyActions.onSortModelChange(sortModel))}
      />
    );
  }

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
          {tableContent}
        </div>
      </CardContent>
    </Card>
  );
}

export default WordFrequencyTable;
