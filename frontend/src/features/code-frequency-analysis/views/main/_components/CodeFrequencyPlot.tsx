import { ExportChartButton } from "@components/export-chart-buttons";
import { ITree } from "@components/tree-explorer";
import { CodeFrequency } from "@models/CodeFrequency";
import { CodeRead } from "@models/CodeRead";
import { DocType } from "@models/DocType";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import { Card, CardContent, CardHeader, CircularProgress, IconButton, Tooltip } from "@mui/material";
import { Dispatch, SetStateAction, useMemo, useReducer, useState } from "react";
import type { BarShapeProps, PieSectorShapeProps, TooltipContentProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  Pie,
  PieChart,
  Rectangle,
  ResponsiveContainer,
  Sector,
  XAxis,
  YAxis,
} from "recharts";
import { Node } from "ts-tree-structure";
import { useCodeFrequenciesQuery } from "../../../_api/codeFrequencyAnalysisQueryOptions";

const renderCustomizedLabel = (data: { value: number; percent?: number }) => {
  return `${data.value} (${(data.percent ?? 0 * 100).toFixed(0)}%)`;
};

function CustomTooltipContent(props: TooltipContentProps) {
  const { active, payload, label } = props;
  const isVisible = !!active && !!payload && payload.length > 0;

  return (
    <Card style={{ visibility: isVisible ? "visible" : "hidden", margin: "8px" }}>
      {isVisible && (
        <CardContent style={{ padding: "8px" }}>
          <p>{label ?? "No Label"}</p>
          <p>
            Count: {payload?.[0]?.payload.count}
            <br />
            Total Count: {payload?.[0]?.payload.total_count}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

interface CodeFrequencyPlotProps {
  projectId: number;
  userIds: number[];
  docTypes: DocType[];
  setSelectedCode: Dispatch<SetStateAction<number | undefined>>;
  data: Node<ITree<CodeRead>>;
}

export function CodeFrequencyPlot({ projectId, userIds, docTypes, data, setSelectedCode }: CodeFrequencyPlotProps) {
  // local state
  const [selectedData, setSelectedData] = useState<Node<ITree<CodeRead>>>();
  const [showPieChart, toggleShowPieChart] = useReducer((previous) => !previous, false);

  // global server state (react-query)
  const chartData = useCodeFrequenciesQuery(
    projectId,
    userIds,
    data.children.map((node) => node.model.data.id) || [],
    docTypes,
  );

  // computed
  const codeId2Code = useMemo(() => {
    const result = new Map<number, CodeRead>();
    for (const node of data.children) {
      result.set(node.model.data.id, node.model.data as CodeRead);
    }
    return result;
  }, [data]);

  // ui events
  const handleClick = (codeFrequency: CodeFrequency) => {
    setSelectedData(data.children.find((node) => node.model.data.id === codeFrequency.code_id));
    setSelectedCode(codeFrequency.code_id);
  };

  const getCodeColor = (codeId: number | undefined) => {
    if (codeId === undefined) {
      return "red";
    }
    return codeId2Code.get(codeId)?.color || "red";
  };

  return (
    <>
      <Card variant="outlined">
        <CardHeader
          action={
            <>
              <Tooltip title={showPieChart ? "View as Bar Chart" : "View as Pie Chart"}>
                <IconButton onClick={toggleShowPieChart}>
                  {showPieChart ? <BarChartIcon /> : <PieChartIcon />}
                </IconButton>
              </Tooltip>
              <ExportChartButton
                chartName={"code-frequency-" + (showPieChart ? "pie-chart-" : "bar-chart-") + data.model.data.name}
                chartIdentifier={`code-frequency-chart-${data.model.data.name}`}
              />
            </>
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
                <PieChart className={`code-frequency-chart-${data.model.data.name}`}>
                  <ChartTooltip />
                  <Pie
                    data={chartData.data}
                    dataKey={(obj) => obj.total_count}
                    nameKey={(obj) => codeId2Code.get(obj.code_id)?.name || "Error: Code not found"}
                    cx="50%"
                    cy="50%"
                    fill="#8884d8"
                    label={renderCustomizedLabel}
                    onClick={(data) => handleClick(data.payload as CodeFrequency)}
                    shape={(props: PieSectorShapeProps) => {
                      const codeFrequency = props.payload as CodeFrequency | undefined;
                      const codeId = codeFrequency?.code_id;
                      return (
                        <Sector
                          {...props}
                          fill={getCodeColor(codeId)}
                          stroke={selectedData?.model.data.id === codeId ? "black" : undefined}
                          strokeWidth={2}
                          style={{ cursor: "pointer" }}
                        />
                      );
                    }}
                  />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={chartData.data} className={`code-frequency-chart-${data.model.data.name}`}>
                  <XAxis
                    dataKey={(codeFrequency) => codeId2Code.get(codeFrequency.code_id)?.name || "Error: Code not found"}
                    interval={0}
                    textAnchor="end"
                    angle={315}
                    height={100}
                  />
                  <YAxis
                    dataKey={(codeFrequency) => codeFrequency.total_count}
                    scale="log"
                    interval={"preserveEnd"}
                    domain={[0.5, "auto"]}
                    allowDataOverflow
                  />
                  <CartesianGrid stroke="#eee" />
                  <ChartTooltip content={CustomTooltipContent} />
                  <Bar
                    dataKey={(codeFrequency) => codeFrequency.total_count}
                    fill="#8884d8"
                    onClick={(data) => handleClick(data.payload as CodeFrequency)}
                    shape={(props: BarShapeProps) => {
                      const codeFrequency = props.payload as CodeFrequency | undefined;
                      const codeId = codeFrequency?.code_id;
                      return (
                        <Rectangle
                          {...props}
                          fill={getCodeColor(codeId)}
                          stroke={selectedData?.model.data.id === codeId ? "black" : undefined}
                          strokeWidth={2}
                          style={{ cursor: "pointer" }}
                        />
                      );
                    }}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : chartData.isSuccess && chartData.data.length === 0 ? (
            <>No plot available!</>
          ) : chartData.isLoading || chartData.isFetching ? (
            <CircularProgress />
          ) : chartData.isError ? (
            <>An Error occurred: {chartData.error.message}</>
          ) : null}
        </CardContent>
      </Card>
      {selectedData && (
        <CodeFrequencyPlot
          key={selectedData.model.data.id}
          projectId={projectId}
          userIds={userIds}
          docTypes={docTypes}
          data={selectedData}
          setSelectedCode={setSelectedCode}
        />
      )}
    </>
  );
}
