import {
  Box,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import { ClassifierRead } from "../../api/openapi/models/ClassifierRead.ts";
import { dateToLocaleDate } from "../../utils/DateUtils.ts";
import ClassifierDataPlot from "./plots/ClassifierDataPlot.tsx";
import ClassifierLossPlot from "./plots/ClassifierLossPlot.tsx";

interface ClassifierDetailPanelProps {
  classifier: ClassifierRead;
}

function ClassifierDetailPanel({ classifier }: ClassifierDetailPanelProps) {
  return (
    <Stack width="100%" spacing={2}>
      <Box width="100%">
        <Typography variant="h6">Training</Typography>
        <Stack direction="row" spacing={4} alignItems="center" width="100%">
          <Box width="100%" height="200px">
            <Typography fontWeight="bold" color="textSecondary" textAlign="center">
              Train Data Statistics
            </Typography>
            <ClassifierDataPlot data={classifier.train_data_stats} classifierModel={classifier.type} />
          </Box>
          <Box width="100%" height="200px">
            <Typography fontWeight="bold" color="textSecondary" textAlign="center">
              Training Loss
            </Typography>
            <ClassifierLossPlot loss={classifier.train_loss} />
          </Box>
        </Stack>
      </Box>
      {classifier.evaluations.map((evaluation) => (
        <>
          <Divider />
          <Box key={evaluation.id} width="100%">
            <Typography variant="h6" mb={1}>
              Evaluation ({dateToLocaleDate(evaluation.created).toLocaleString()})
            </Typography>
            <Stack direction="row" spacing={4} alignItems="center" width="100%">
              <Box width="100%" height="200px">
                <Typography fontWeight="bold" color="textSecondary" textAlign="center">
                  Eval Data Statistics
                </Typography>
                <ClassifierDataPlot data={evaluation.eval_data_stats} classifierModel={classifier.type} />
              </Box>
              <Box width="100%" height="200px">
                <Typography fontWeight="bold" color="textSecondary" textAlign="center">
                  Metrics
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Accuracy</TableCell>
                        <TableCell align="left">{evaluation.accuracy.toFixed(4)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>F1</TableCell>
                        <TableCell align="left">{evaluation.f1.toFixed(4)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Precision</TableCell>
                        <TableCell align="left">{evaluation.precision.toFixed(4)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Recall</TableCell>
                        <TableCell align="left">{evaluation.recall.toFixed(4)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          </Box>
        </>
      ))}
    </Stack>
  );
}

export default ClassifierDetailPanel;
