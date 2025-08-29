import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClassifierLoss } from "../../../api/openapi/models/ClassifierLoss.ts";

interface ClassifierLossPlotProps {
  loss: ClassifierLoss[];
}

function ClassifierLossPlot({ loss }: ClassifierLossPlotProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
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

export default ClassifierLossPlot;
