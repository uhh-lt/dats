import { Box, Stack, Typography } from "@mui/material";
import { ClassifierRead } from "../../api/openapi/models/ClassifierRead.ts";
import ClassifierDataPlot from "./plots/ClassifierDataPlot.tsx";
import ClassifierLossPlot from "./plots/ClassifierLossPlot.tsx";

interface ClassifierDetailPanelProps {
  classifier: ClassifierRead;
}

function ClassifierDetailPanel({ classifier }: ClassifierDetailPanelProps) {
  return (
    <Stack>
      <Box>
        <Typography>Training</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box>
            <Typography>Training Data</Typography>
            <ClassifierDataPlot data={classifier.train_data_stats} />
          </Box>
          <Box>
            <Typography>Training Process</Typography>
            <ClassifierLossPlot loss={classifier.train_loss} />
          </Box>
        </Stack>
      </Box>
      {classifier.evaluations.map((evaluation) => (
        <Box key={evaluation.id}>
          <Typography>Evaluation ({evaluation.created})</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box>
              <Typography>Evaluation Data</Typography>
              <ClassifierDataPlot data={evaluation.eval_data_stats} />
            </Box>
            <Box>
              <Typography>Evaluation Metrics</Typography>
              <Stack direction="row" spacing={1}>
                <Typography>Accuracy: {evaluation.accuracy.toFixed(4)}</Typography>
                <Typography>F1: {evaluation.f1.toFixed(4)}</Typography>
                <Typography>Precision: {evaluation.precision.toFixed(4)}</Typography>
                <Typography>Recall: {evaluation.recall.toFixed(4)}</Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export default ClassifierDetailPanel;
