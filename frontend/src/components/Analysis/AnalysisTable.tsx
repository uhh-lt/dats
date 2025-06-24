import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useMemo } from "react";
import { TimelineAnalysisRead } from "../../api/openapi/models/TimelineAnalysisRead.ts";
import TimelineAnalysisHooks from "../../api/TimelineAnalysisHooks.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import UserName from "../User/UserName.tsx";

const columns: MRT_ColumnDef<TimelineAnalysisRead>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "updated",
    header: "Last Modified",
    Cell: ({ row }) => dateToLocaleString(row.original.updated),
  },
  {
    accessorKey: "user_id",
    header: "Owner",
    Cell: ({ row }) => <UserName userId={row.original.user_id} />,
  },
  {
    accessorKey: "timeline_analysis_type",
    header: "Type",
  },
];

export interface AnalysisTableActionProps {
  table: MRT_TableInstance<TimelineAnalysisRead>;
  selectedAnalyses: TimelineAnalysisRead[];
}

interface AnalysisTableProps {
  projectId: number;
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<TimelineAnalysisRead>["onRowSelectionChange"];
  // toolbar
  renderTopRightToolbar?: (props: AnalysisTableActionProps) => React.ReactNode;
  renderTopLeftToolbar?: (props: AnalysisTableActionProps) => React.ReactNode;
  renderBottomToolbar?: (props: AnalysisTableActionProps) => React.ReactNode;
}

function AnalysisTable({
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderTopRightToolbar,
  renderTopLeftToolbar,
  renderBottomToolbar,
}: AnalysisTableProps) {
  // global server state
  const userAnalysis = TimelineAnalysisHooks.useGetUserTimelineAnalysisList();

  // computed
  const { userAnalysisMap, userAnalysisRows } = useMemo(() => {
    if (!userAnalysis.data) return { userAnalysisMap: {}, userAnalysisRows: [] };

    const userAnalysisMap = userAnalysis.data.reduce(
      (acc, analysis) => {
        acc[analysis.id.toString()] = analysis;
        return acc;
      },
      {} as Record<string, TimelineAnalysisRead>,
    );

    return { userAnalysisMap, userAnalysisRows: userAnalysis.data };
  }, [userAnalysis.data]);

  // rendering
  const renderTopLeftToolbarContent = useMemo(
    () =>
      renderTopLeftToolbar
        ? (props: { table: MRT_TableInstance<TimelineAnalysisRead> }) =>
            renderTopLeftToolbar({
              table: props.table,
              selectedAnalyses: Object.keys(rowSelectionModel).map((analysisId) => userAnalysisMap[analysisId]),
            })
        : undefined,
    [userAnalysisMap, rowSelectionModel, renderTopLeftToolbar],
  );

  const renderBottomToolbarContent = useMemo(
    () =>
      renderBottomToolbar
        ? (props: { table: MRT_TableInstance<TimelineAnalysisRead> }) =>
            renderBottomToolbar({
              table: props.table,
              selectedAnalyses: Object.keys(rowSelectionModel).map((analysisId) => userAnalysisMap[analysisId]),
            })
        : undefined,
    [userAnalysisMap, rowSelectionModel, renderBottomToolbar],
  );

  const renderTopRightToolbarContent = useMemo(
    () =>
      renderTopRightToolbar
        ? (props: { table: MRT_TableInstance<TimelineAnalysisRead> }) =>
            renderTopRightToolbar({
              table: props.table,
              selectedAnalyses: Object.keys(rowSelectionModel).map((analysisId) => userAnalysisMap[analysisId]),
            })
        : undefined,
    [userAnalysisMap, rowSelectionModel, renderTopRightToolbar],
  );

  // table
  const table = useMaterialReactTable<TimelineAnalysisRead>({
    data: userAnalysisRows,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // style
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // state
    state: {
      rowSelection: rowSelectionModel,
      isLoading: userAnalysis.isLoading,
      showAlertBanner: userAnalysis.isError,
      showProgressBars: userAnalysis.isFetching,
    },
    // handle error
    muiToolbarAlertBannerProps: userAnalysis.isError
      ? {
          color: "error",
          children: userAnalysis.error?.message || "Error loading data",
        }
      : undefined,
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    // selection
    enableRowSelection: true,
    enableMultiRowSelection,
    onRowSelectionChange,
    // toolbar
    enableBottomToolbar: !!renderBottomToolbar,
    renderTopToolbarCustomActions: renderTopLeftToolbarContent,
    renderToolbarInternalActions: renderTopRightToolbarContent,
    renderBottomToolbarCustomActions: renderBottomToolbarContent,
    // hide columns per default
    initialState: {
      columnVisibility: {
        id: false,
      },
    },
  });

  return <MaterialReactTable table={table} />;
}

export default memo(AnalysisTable);
