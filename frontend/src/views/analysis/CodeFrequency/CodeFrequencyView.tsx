import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import { Card, CardContent, CardHeader, IconButton, Tooltip } from "@mui/material";
import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
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
import { CodeFrequency } from "../../../api/openapi/models/CodeFrequency.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { IDataTree } from "../../../features/TreeExplorer/IDataTree.ts";

const renderCustomizedLabel = (data: { value: string; percent: number }) => {
  return `${data.value} (${(data.percent * 100).toFixed(0)}%)`;
};

interface CodeFrequencyViewProps {
  projectId: number;
  userIds: number[];
  setSelectedCode: Dispatch<SetStateAction<number | undefined>>;
  data: Node<IDataTree>;
}

function CodeFrequencyView({ projectId, userIds, data, setSelectedCode }: CodeFrequencyViewProps) {
  // local state
  const [selectedData, setSelectedData] = useState<Node<IDataTree>>();
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
      result.set(node.model.data.id, node.model.data as CodeRead);
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

export default CodeFrequencyView;
