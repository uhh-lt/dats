import { Link as RouterLink, useParams } from "react-router-dom";
import { CodeStatistics, Statistic, useGetCodeStatisticTree } from "./useGetCodeStatisticTree";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import React, { Dispatch, SetStateAction, useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  Link,
  Portal,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import { renderTextCellExpand } from "./renderTextCellExpand";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", hide: true },
  {
    field: "sdoc",
    headerName: "Document",
    flex: 1,
    valueGetter: (params: GridValueGetterParams) => params.row.sdoc.filename,
    renderCell: (params) => (
      <Link
        component={RouterLink}
        to={`/project/${params.row.sdoc.project_id}/search/doc/${params.row.sdoc.id}`}
        underline="none"
        color="inherit"
      >
        {params.row.sdoc.filename}
      </Link>
    ),
  },
  {
    field: "code",
    headerName: "Code",
    flex: 1,
    valueGetter: (params: GridValueGetterParams) => params.row.code.name,
    renderCell: (params) => (
      <Stack direction="row" alignItems="center" component="span">
        <Box
          sx={{ width: 20, height: 20, backgroundColor: params.row.code.color, ml: 1.5, mr: 1, flexShrink: 0 }}
          component="span"
        />
        {params.row.code.name}
      </Stack>
    ),
  },
  {
    field: "text",
    headerName: "Text",
    flex: 4,
    description: "The text of the annotation",
    renderCell: renderTextCellExpand,
  },
  { field: "count", headerName: "Count", type: "number" },
];

function allSpans(codeStatistics: CodeStatistics): Statistic[] {
  const result = Array.from(codeStatistics.spans);
  for (const child of codeStatistics.children) {
    result.push(...allSpans(child));
  }
  return result;
}

function CodeFrequency() {
  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // custom hook
  const data = useGetCodeStatisticTree(projectId);

  // local state
  const [selectedStatistic, setSelectedStatistic] = useState<CodeStatistics>();
  const [page, setPage] = useState<number>(0);

  // computed
  const tableData = useMemo(() => (selectedStatistic ? allSpans(selectedStatistic) : []), [selectedStatistic]);

  // effets
  //init selected statistics with root node
  useEffect(() => {
    if (data.data) {
      setSelectedStatistic(data.data);
    }
  }, [data.data]);
  // reset page to 0 when selected statistics change
  useEffect(() => {
    setPage(0);
  }, [selectedStatistic]);

  return (
    <Grid container columnSpacing={1} className="h100" px={2} pt={2}>
      {data.data && selectedStatistic ? (
        <>
          <Portal container={appBarContainerRef?.current}>
            <Typography variant="h6" color="inherit" component="div">
              Frequency Analysis
            </Typography>
          </Portal>
          <Grid item xs={6} className="h100" sx={{ overflowY: "auto", pr: 1, py: 1 }}>
            <Stack spacing={2}>
              <CodeFrequencyView data={data.data} setStatistics={setSelectedStatistic} />
            </Stack>
          </Grid>
          <Grid item xs={6} className="h100" sx={{ py: 1 }}>
            <Card className="h100 myFlexContainer" variant="outlined">
              <CardHeader
                className="myFlexFitContentContainer"
                action={
                  <IconButton aria-label="settings">
                    <MoreVertIcon />
                  </IconButton>
                }
                title={
                  selectedStatistic.name !== "root"
                    ? `Occurrences of code ${selectedStatistic.code?.name}`
                    : "All code occurrences"
                }
                subheader="A description of this table"
              />
              <CardContent className="myFlexFillAllContainer" sx={{ px: 0 }}>
                <DataGrid
                  rows={tableData}
                  columns={columns}
                  autoPageSize
                  sx={{ border: "none" }}
                  disableSelectionOnClick
                  page={page}
                  onPageChange={(page) => setPage(page)}
                />
              </CardContent>
            </Card>
          </Grid>
        </>
      ) : data.isError ? (
        <Grid item xs={12}>
          ERROR: {data.error.message}
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
const renderCustomizedLabel = (data: any) => {
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

interface CodeFrequencyViewProps {
  setStatistics: Dispatch<SetStateAction<CodeStatistics | undefined>>;
  data: CodeStatistics;
}

function CodeFrequencyView({ data, setStatistics }: CodeFrequencyViewProps) {
  // local state
  const [selectedData, setSelectedData] = useState<CodeStatistics>();
  const [showPieChart, toggleShowPieChart] = React.useReducer((previous) => !previous, false);

  // computed
  const chartData = useMemo(() => data.children.filter((x) => x.aggregatedCount > 0), [data]);

  // effects
  // reset selection when data changes
  useEffect(() => {
    setSelectedData(undefined);
  }, [data]);

  // ui events
  const handleClick = (data: any) => {
    setSelectedData(data);
    setStatistics(data);
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
          title={data.name === "root" ? "Top-level codes" : data.name}
          subheader={
            data.children.length > 0
              ? "Click on a bar to see the code's subcategories and add it as a filter"
              : "This code has no subcategories"
          }
        />
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              {showPieChart ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="aggregatedCount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    fill="#8884d8"
                    label={renderCustomizedLabel}
                    onClick={handleClick}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`codecell-${entry.code!.id}`}
                        fill={entry.code!.color}
                        stroke={selectedData?.code?.id === entry.code?.id ? "black" : undefined}
                        strokeWidth={2}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={chartData}>
                  <Bar dataKey="aggregatedCount" fill="#8884d8" onClick={handleClick}>
                    {chartData.map((entry) => (
                      <Cell
                        key={`codecell-${entry.code!.id}`}
                        fill={entry.code!.color}
                        stroke={selectedData?.code?.id === entry.code?.id ? "black" : undefined}
                        strokeWidth={2}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Bar>
                  {/*<CartesianGrid stroke="#ccc" />*/}
                  <XAxis dataKey="name" />
                  <YAxis />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <>No plot available!</>
          )}
        </CardContent>
      </Card>
      {selectedData && <CodeFrequencyView data={selectedData} setStatistics={setStatistics} />}
    </>
  );
}

export default CodeFrequency;
