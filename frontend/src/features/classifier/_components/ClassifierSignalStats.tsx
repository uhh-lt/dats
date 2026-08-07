import { CodeHooks } from "@api/hooks/CodeHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { ClassifierClassStatistics } from "@models/ClassifierClassStatistics";
import { ClassifierDatasetStatistics } from "@models/ClassifierDatasetStatistics";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierSignalStrength } from "@models/ClassifierSignalStrength";
import { Alert, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useMemo } from "react";
import { classifierUnitLabel } from "./classifierUnitLabel";

interface ClassifierSignalStatsProps {
  statistics: ClassifierDatasetStatistics;
  classifierModel: ClassifierModel;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const signalStrengthInfo: Record<
  ClassifierSignalStrength,
  { severity: "error" | "warning" | "success"; label: string }
> = {
  [ClassifierSignalStrength.WEAK]: { severity: "error", label: "Weak training signal" },
  [ClassifierSignalStrength.OK]: { severity: "warning", label: "OK training signal" },
  [ClassifierSignalStrength.STRONG]: { severity: "success", label: "Strong training signal" },
};

export function ClassifierSignalStats({ statistics, classifierModel }: ClassifierSignalStatsProps) {
  const unitLabel = classifierUnitLabel[classifierModel];

  const signalPercentage = statistics.signal_percentage;
  const { severity, label: signalLabel } = signalStrengthInfo[statistics.signal_strength];

  return (
    <Stack spacing={2}>
      <Alert variant="standard" severity={severity} sx={{ border: "1px solid", borderColor: `${severity}.main` }}>
        {signalLabel}: {formatPercentage(signalPercentage)} of all {unitLabel} are labeled (
        {statistics.labeled_units.toLocaleString()} / {statistics.total_units.toLocaleString()} {unitLabel}).
      </Alert>
      <ClassUnitsTable classes={statistics.classes} classifierModel={classifierModel} unitLabel={unitLabel} />
    </Stack>
  );
}

function ClassUnitsTable({
  classes,
  classifierModel,
  unitLabel,
}: {
  classes: ClassifierClassStatistics[];
  classifierModel: ClassifierModel;
  unitLabel: string;
}) {
  const projectCodeMap = CodeHooks.useGetAllCodesMap();
  const projectTags = TagHooks.useGetAllTags();

  const rows = useMemo(() => {
    const tagMap = Object.fromEntries((projectTags.data ?? []).map((tag) => [tag.id, tag]));
    return [...classes]
      .sort((a, b) => a.class_id - b.class_id)
      .map((classStats) => {
        let name: string;
        if (classifierModel === ClassifierModel.DOCUMENT) {
          name = tagMap[classStats.class_id]?.name ?? `Tag ${classStats.class_id}`;
        } else {
          name = projectCodeMap.data?.[classStats.class_id]?.name ?? `Code ${classStats.class_id}`;
        }
        return { ...classStats, name };
      });
  }, [classes, classifierModel, projectCodeMap.data, projectTags.data]);

  if (rows.length === 0) {
    return (
      <Typography color="textSecondary" fontStyle="italic">
        No classes selected
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Class</TableCell>
          <TableCell align="right">Examples</TableCell>
          <TableCell align="right">Labeled {unitLabel}</TableCell>
          <TableCell align="right">% of all {unitLabel}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.class_id}>
            <TableCell>{row.name}</TableCell>
            <TableCell align="right">{row.num_examples.toLocaleString()}</TableCell>
            <TableCell align="right">{row.num_units.toLocaleString()}</TableCell>
            <TableCell align="right">{formatPercentage(row.unit_percentage)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
