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
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { ClassifierEvaluationRead } from "../../api/openapi/models/ClassifierEvaluationRead.ts";
import { ClassifierModel } from "../../api/openapi/models/ClassifierModel.ts";
import { ClassifierRead } from "../../api/openapi/models/ClassifierRead.ts";
import { dateToLocaleDate } from "../../utils/DateUtils.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import ClassifierDataPlot from "./plots/ClassifierDataPlot.tsx";
import ClassifierLossPlot from "./plots/ClassifierLossPlot.tsx";

interface ClassifierDetailPanelProps {
  classifier: ClassifierRead;
}

function ClassifierDetails({ classifier }: ClassifierDetailPanelProps) {
  return (
    <Stack width="100%" spacing={2}>
      <TrainingDetails classifier={classifier} />
      {classifier.evaluations.map((evaluation) => (
        <React.Fragment key={evaluation.id}>
          <Divider />
          <EvaluationDetails classifierModel={classifier.type} evaluation={evaluation} />
        </React.Fragment>
      ))}
    </Stack>
  );
}

function TrainingDetails({ classifier }: { classifier: ClassifierRead }) {
  const tooltipContent = (
    <Typography variant="body2" component="div">
      <b>Training Parameters</b>
      {Object.entries(classifier.train_params).map(([key, value]) => (
        <React.Fragment key={key}>
          <br />
          <em>{key}:</em> {String(value)}
        </React.Fragment>
      ))}
    </Typography>
  );
  return (
    <Box width="100%">
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="h6">Training</Typography>
        <Tooltip title={tooltipContent} arrow>
          {getIconComponent(Icon.INFO)}
        </Tooltip>
      </Stack>
      <Stack direction="row" spacing={4} alignItems="center" width="100%">
        <Box width="100%">
          <Typography fontWeight="bold" color="textSecondary" textAlign="center">
            Train Data Statistics
          </Typography>
          <ClassifierDataPlot data={classifier.train_data_stats} classifierModel={classifier.type} minHeight={180} />
        </Box>
        <Box width="100%">
          <Typography fontWeight="bold" color="textSecondary" textAlign="center">
            Training Loss
          </Typography>
          <ClassifierLossPlot loss={classifier.train_loss} minHeight={180} />
        </Box>
      </Stack>
    </Box>
  );
}

function EvaluationDetails({
  evaluation,
  classifierModel,
}: {
  evaluation: ClassifierEvaluationRead;
  classifierModel: ClassifierModel;
}) {
  return (
    <Box width="100%">
      <Typography variant="h6" mb={1}>
        Evaluation ({dateToLocaleDate(evaluation.created).toLocaleString()})
      </Typography>
      <Stack direction="row" spacing={4} alignItems="flex-start" width="100%">
        <Box width="100%">
          <Typography fontWeight="bold" color="textSecondary" textAlign="center">
            Eval Data Statistics
          </Typography>
          <ClassifierDataPlot data={evaluation.eval_data_stats} classifierModel={classifierModel} minHeight={180} />
        </Box>
        <Box width="100%">
          <Typography fontWeight="bold" color="textSecondary" textAlign="center" mb="4px">
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
  );
}

ClassifierDetails.Training = TrainingDetails;
ClassifierDetails.Evaluation = EvaluationDetails;

export default ClassifierDetails;
