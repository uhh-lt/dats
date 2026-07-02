import { ClassifierLoss } from "@models/ClassifierLoss";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ClassifierLossPlotProps {
  minHeight?: string | number | undefined;
  loss: ClassifierLoss[];
}

export function ClassifierLossPlot({ loss, minHeight }: ClassifierLossPlotProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={minHeight}>
      <LineChart data={loss}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="step" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
