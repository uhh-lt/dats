import { CodeHooks } from "@api/hooks/CodeHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { getIconComponent, Icon } from "@components/icons";
import { ClassifierClassMetrics } from "@models/ClassifierClassMetrics";
import { ClassifierData } from "@models/ClassifierData";
import { ClassifierEvaluationRead } from "@models/ClassifierEvaluationRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierRead } from "@models/ClassifierRead";
import {
  Box,
  Divider,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { dateToLocaleDate } from "@utils/DateUtils";
import { Fragment, useMemo, useState } from "react";
import { ClassifierDataPlot } from "./ClassifierDataPlot";
import { ClassifierLossPlot } from "./ClassifierLossPlot";

interface ClassifierDetailPanelProps {
  classifier: ClassifierRead;
}

export function ClassifierDetails({ classifier }: ClassifierDetailPanelProps) {
  return (
    <Stack width="100%" spacing={2}>
      <TrainingDetails classifier={classifier} />
      {classifier.evaluations.map((evaluation) => (
        <Fragment key={evaluation.id}>
          <Divider />
          <EvaluationDetails classifierModel={classifier.type} evaluation={evaluation} />
        </Fragment>
      ))}
    </Stack>
  );
}

function TrainingDetails({ classifier }: { classifier: ClassifierRead }) {
  const tooltipContent = (
    <Typography variant="body2" component="div">
      <b>Training Parameters</b>
      {Object.entries(classifier.train_params).map(([key, value]) => (
        <Fragment key={key}>
          <br />
          <em>{key}:</em> {String(value)}
        </Fragment>
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
      {evaluation.class_metrics && evaluation.class_metrics.length > 0 && (
        <PerClassMetrics classMetrics={evaluation.class_metrics} classifierModel={classifierModel} />
      )}
    </Box>
  );
}

const ALL_CLASSES = -1;

function PerClassMetrics({
  classMetrics,
  classifierModel,
}: {
  classMetrics: ClassifierClassMetrics[];
  classifierModel: ClassifierModel;
}) {
  const [selectedClassId, setSelectedClassId] = useState<number>(ALL_CLASSES);

  // resolve class names (tags for document classifiers, codes otherwise)
  const projectTags = TagHooks.useGetAllTags();
  const projectCodes = CodeHooks.useGetAllCodesMap();
  const className = useMemo(() => {
    const names: Record<number, string> = {};
    if (classifierModel === ClassifierModel.DOCUMENT) {
      const tagsMap = Object.fromEntries((projectTags.data ?? []).map((tag) => [tag.id, tag]));
      for (const m of classMetrics) {
        names[m.class_id] = tagsMap[m.class_id]?.name || `Tag ${m.class_id}`;
      }
    } else {
      const codesMap = projectCodes.data ?? {};
      for (const m of classMetrics) {
        names[m.class_id] = codesMap[m.class_id]?.name || `Code ${m.class_id}`;
      }
    }
    return names;
  }, [classMetrics, classifierModel, projectTags.data, projectCodes.data]);

  const selected = classMetrics.find((m) => m.class_id === selectedClassId);

  return (
    <Box width="100%" mt={2}>
      <Stack direction="row" spacing={2} alignItems="center" mb={1}>
        <Typography fontWeight="bold" color="textSecondary">
          Per-class Metrics
        </Typography>
        <Select
          size="small"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(Number(e.target.value))}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value={ALL_CLASSES}>
            <em>All classes</em>
          </MenuItem>
          {classMetrics.map((m) => (
            <MenuItem key={m.class_id} value={m.class_id}>
              {className[m.class_id]}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      {selectedClassId === ALL_CLASSES || !selected ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell align="right">Precision</TableCell>
                <TableCell align="right">Recall</TableCell>
                <TableCell align="right">F1</TableCell>
                <TableCell align="right">Support</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classMetrics.map((m) => (
                <TableRow key={m.class_id}>
                  <TableCell>{className[m.class_id]}</TableCell>
                  <TableCell align="right">{m.precision.toFixed(4)}</TableCell>
                  <TableCell align="right">{m.recall.toFixed(4)}</TableCell>
                  <TableCell align="right">{m.f1.toFixed(4)}</TableCell>
                  <TableCell align="right">{m.support}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Precision</TableCell>
                <TableCell align="left">{selected.precision.toFixed(4)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Recall</TableCell>
                <TableCell align="left">{selected.recall.toFixed(4)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>F1</TableCell>
                <TableCell align="left">{selected.f1.toFixed(4)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Support</TableCell>
                <TableCell align="left">{selected.support}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function InferenceDetails({
  classifierModel,
  statistics,
  affectedDocs,
}: {
  classifierModel: ClassifierModel;
  statistics: ClassifierData[];
  affectedDocs: number;
}) {
  return (
    <Box width="100%">
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="h6">Inference</Typography>
      </Stack>
      <Typography variant="body2" color="textSecondary">
        The classifier {classifierModel === ClassifierModel.DOCUMENT ? "tagged" : "annotated"} <b>{affectedDocs}</b>{" "}
        documents with the following {classifierModel === ClassifierModel.DOCUMENT ? "tags" : "codes"}:
      </Typography>
      <Stack spacing={2} width="100%">
        <Typography fontWeight="bold" color="textSecondary" textAlign="center">
          Inference Result Statistics
        </Typography>

        <ClassifierDataPlot data={statistics} classifierModel={classifierModel} minHeight={180} />
      </Stack>
    </Box>
  );
}

ClassifierDetails.Training = TrainingDetails;
ClassifierDetails.Evaluation = EvaluationDetails;
ClassifierDetails.Inference = InferenceDetails;
