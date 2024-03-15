import BarChartIcon from "@mui/icons-material/BarChart";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PieChartIcon from "@mui/icons-material/PieChart";
import {
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  IconButton,
  Link,
  Portal,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { MRT_ColumnDef, MRT_PaginationState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import React, { Dispatch, SetStateAction, useContext, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ChartTooltip,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Node } from "ts-tree-structure";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";
import CodeHooks from "../../../api/CodeHooks.ts";
import { CodeFrequency } from "../../../api/openapi/models/CodeFrequency.ts";
import { CodeOccurrence } from "../../../api/openapi/models/CodeOccurrence.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer.tsx";
import UserName from "../../../components/UserName.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree.ts";
import useComputeCodeTree from "../../annotation/CodeExplorer/useComputeCodeTree.ts";
import CodeFrequencyUserSelector from "./CodeFrequencyUserSelector.tsx";

const columns: MRT_ColumnDef<CodeOccurrence>[] = [
  { accessorKey: "id", header: "ID" },
  {
    // accessorKey: "sdoc",
    header: "Document",
    // flex: 1,
    id: "document",
    accessorFn: (params) => params.sdoc.filename,
    Cell: ({ row }) => (
      <Link
        component={RouterLink}
        to={`/project/${row.original.sdoc.project_id}/search/doc/${row.original.sdoc.id}`}
        underline="none"
        color="inherit"
      >
        {row.original.sdoc.filename}
      </Link>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    // flex: 1,
    Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
  },
  {
    accessorKey: "text",
    header: "Text",
    // flex: 4,
    // description: "The text of the annotation",
    // renderCell: renderTextCellExpand,
  },
  {
    accessorKey: "count",
    header: "Count",
    //  type: "number"
  },
];

function CodeFrequencyAnalysis() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (react-redux)
  const selectedUserIds = useAppSelector((state) => state.analysis.selectedUserIds);

  // custom hook
  const { codeTree, allCodes } = useComputeCodeTree();

  // local state
  const [selectedCode, setSelectedCode] = useState<number>();

  // effects
  // reset selected code when selectedUserIds change
  useEffect(() => {
    setSelectedCode(undefined);
  }, [selectedUserIds]);

  return (
    <Grid container columnSpacing={1} className="h100" px={2} pt={2}>
      {codeTree ? (
        <>
          <Portal container={appBarContainerRef?.current}>
            <Typography variant="h6" color="inherit" component="div">
              Frequency Analysis
            </Typography>
          </Portal>
          <Grid item xs={6} className="h100" sx={{ overflowY: "auto", pr: 1, py: 1 }}>
            <Stack spacing={2}>
              <CodeFrequencyUserSelector projectId={projectId} />
              <CodeFrequencyView
                key={selectedUserIds?.join(",")} // re-render when selectedUserIds change
                projectId={projectId}
                userIds={selectedUserIds || []}
                data={codeTree}
                setSelectedCode={setSelectedCode}
              />
            </Stack>
          </Grid>
          <Grid item xs={6} className="h100" sx={{ py: 1 }}>
            {selectedCode ? (
              <CodeOccurrenceView projectId={projectId} codeId={selectedCode} userIds={selectedUserIds || []} />
            ) : (
              <Card className="h100" variant="outlined">
                <CardHeader title={`Click on a bar / slice to see occurrences!`} />
              </Card>
            )}
          </Grid>
        </>
      ) : allCodes.isError ? (
        <Grid item xs={12}>
          ERROR: {allCodes.error.message}
        </Grid>
      ) : (
        <Grid item xs={12}>
          Loading...
        </Grid>
      )}
    </Grid>
  );
}

// const RADIAN = Math.PI / 180;
const renderCustomizedLabel = (data: { value: string; percent: number }) => {
  return `${data.value} (${(data.percent * 100).toFixed(0)}%)`;

  // const radius = data.innerRadius + (data.outerRadius - data.innerRadius) * 0.5;
  // const x = data.cx + radius * Math.cos(-data.midAngle * RADIAN);
  // const y = data.cy + radius * Math.sin(-data.midAngle * RADIAN);
  //
  // console.log(data);
  //
  // return (
  //   <text x={x} y={y} fill="white" textAnchor={x > data.cx ? "start" : "end"} dominantBaseline="central">
  //     {`${data.value} (${(data.percent * 100).toFixed(0)}%)`}
  //   </text>
  // );
};

interface CodeOccurrenceViewProps {
  projectId: number;
  codeId: number;
  userIds: number[];
}

function CodeOccurrenceView({ projectId, codeId, userIds }: CodeOccurrenceViewProps) {
  const [paginationModel, setPaginationModel] = useState<MRT_PaginationState>({
    pageSize: 5,
    pageIndex: 0,
  });

  // global server state (react-query)
  const code = CodeHooks.useGetCode(codeId);

  // computed
  const codeOccurrences = AnalysisHooks.useCodeOccurrences(projectId, userIds, codeId);

  // reset page to 0 when selected statistics change
  useEffect(() => {
    setPaginationModel((oldPaginationModel) => ({ ...oldPaginationModel, page: 0 }));
  }, [codeId]);

  // table
  const table = useMaterialReactTable({
    data: codeOccurrences.data || [],
    columns: columns,
    // autoPageSize
    // sx={{ border: "none" }}
    getRowId: (row) => `sdoc-${row.sdoc.id}-code/${row.code.id}-${row.text}`,
    // state
    state: {
      pagination: paginationModel,
      isLoading: columns.length === 0,
    },
    // selection
    enableRowSelection: false,
  });

  return (
    <>
      {codeOccurrences.isSuccess && code.isSuccess ? (
        <Card className="h100 myFlexContainer" variant="outlined">
          <CardHeader
            className="myFlexFitContentContainer"
            action={
              <IconButton aria-label="settings">
                <MoreVertIcon />
              </IconButton>
            }
            title={`Occurrences of code '${code.data.name}'`}
            subheader={
              <>
                annotated by{" "}
                {userIds.map((userId, index) => (
                  <>
                    <UserName key={userId} userId={userId} />
                    {index < userIds.length - 1 ? ", " : ""}
                  </>
                ))}
              </>
            }
          />
          <CardContent className="myFlexFillAllContainer" sx={{ px: 0 }}>
            <MaterialReactTable table={table} />
          </CardContent>
        </Card>
      ) : codeOccurrences.isError ? (
        <div>ERROR: {codeOccurrences.error.message}</div>
      ) : code.isError ? (
        <div>ERROR: {code.error.message}</div>
      ) : (
        <CircularProgress />
      )}
    </>
  );
}

interface CodeFrequencyViewProps {
  projectId: number;
  userIds: number[];
  setSelectedCode: Dispatch<SetStateAction<number | undefined>>;
  data: Node<ICodeTree>;
}

function CodeFrequencyView({ projectId, userIds, data, setSelectedCode }: CodeFrequencyViewProps) {
  // local state
  const [selectedData, setSelectedData] = useState<Node<ICodeTree>>();
  const [showPieChart, toggleShowPieChart] = React.useReducer((previous) => !previous, false);

  // global server state (react-query)
  const chartData = AnalysisHooks.useCodeFrequencies(
    projectId,
    userIds,
    data.children.map((node) => node.model.data.id) || [],
  );

  // computed
  const codeId2Code = useMemo(() => {
    const result = new Map<number, CodeRead>();
    for (const node of data.children) {
      result.set(node.model.data.id, node.model.data);
    }
    return result;
  }, [data]);

  // effects
  // reset selection when data changes
  useEffect(() => {
    setSelectedData(undefined);
  }, [data]);

  // ui events
  const handleClick = (codeFrequency: CodeFrequency) => {
    setSelectedData(data.children.find((node) => node.model.data.id === codeFrequency.code_id));
    setSelectedCode(codeFrequency.code_id);
  };

  return (
    <>
      <Card variant="outlined">
        <CardHeader
          action={
            <Tooltip title={showPieChart ? "View as Bar Chart" : "View as Pie Chart"}>
              <IconButton onClick={toggleShowPieChart}>{showPieChart ? <BarChartIcon /> : <PieChartIcon />}</IconButton>
            </Tooltip>
          }
          title={data.model.data.name === "root" ? "Top-level codes" : data.model.data.name}
          subheader={
            data.children.length > 0
              ? "Click on a bar to see the code's subcategories and add it as a filter"
              : "This code has no subcategories"
          }
        />
        <CardContent>
          {chartData.isSuccess && chartData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              {showPieChart ? (
                <PieChart>
                  <ChartTooltip />
                  <Pie
                    data={chartData.data}
                    dataKey={(obj) => obj.count}
                    nameKey={(obj) => codeId2Code.get(obj.code_id)?.name || "Error: Code not found"}
                    cx="50%"
                    cy="50%"
                    fill="#8884d8"
                    label={renderCustomizedLabel}
                    onClick={handleClick}
                  >
                    {chartData.data.map((entry) => (
                      <Cell
                        key={`codecell-${entry.code_id}`}
                        fill={codeId2Code.get(entry.code_id)?.color || "red"}
                        stroke={selectedData?.model.data.id === entry.code_id ? "black" : undefined}
                        strokeWidth={2}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={chartData.data}>
                  <XAxis
                    dataKey={(codeFrequency) => codeId2Code.get(codeFrequency.code_id)?.name || "Error: Code not found"}
                    interval={0}
                    textAnchor="end"
                    angle={315}
                    height={100}
                  />
                  <YAxis
                    dataKey={(codeFrequency) => codeFrequency.count}
                    scale="log"
                    interval={"preserveEnd"}
                    domain={[0.5, "auto"]}
                    allowDataOverflow
                  />
                  <CartesianGrid stroke="#eee" />
                  <ChartTooltip />
                  <Bar dataKey={(codeFrequency) => codeFrequency.count} fill="#8884d8" onClick={handleClick}>
                    {chartData.data.map((codeFrequency) => (
                      <Cell
                        key={`codecell-${codeFrequency.code_id}`}
                        fill={codeId2Code.get(codeFrequency.code_id)?.color || "red"}
                        stroke={selectedData?.model.data.id === codeFrequency.code_id ? "black" : undefined}
                        strokeWidth={2}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <>No plot available!</>
          )}
        </CardContent>
      </Card>
      {selectedData && (
        <CodeFrequencyView
          projectId={projectId}
          userIds={userIds}
          data={selectedData}
          setSelectedCode={setSelectedCode}
        />
      )}
    </>
  );
}

export default CodeFrequencyAnalysis;
