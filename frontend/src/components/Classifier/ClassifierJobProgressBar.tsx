import { Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { ClassifierJobRead } from "../../api/openapi/models/ClassifierJobRead.ts";
import LinearProgressWithLabel from "../LinearProgressWithLabel.tsx";

function ClassifierJobProgressBar({ classifierJob }: { classifierJob: ClassifierJobRead | undefined | null }) {
  const progressTooltip = useMemo(() => {
    if (!classifierJob) return "";
    return classifierJob.current_step === classifierJob.steps.length
      ? `Status: All ${classifierJob.steps.length} steps are done.`
      : `Status: ${classifierJob.current_step} of ${classifierJob.steps.length} steps are done.`;
  }, [classifierJob]);

  return (
    <Stack gap={2}>
      {classifierJob && (
        <Typography variant="caption" color="textSecondary" textAlign="center" mb={-3.5}>
          {classifierJob.steps[classifierJob.current_step]}
        </Typography>
      )}
      <LinearProgressWithLabel
        sx={{ ml: 5 }}
        variant={classifierJob ? "determinate" : "indeterminate"}
        current={classifierJob ? classifierJob.current_step : 0}
        max={classifierJob ? classifierJob.steps.length - 1 : 0}
        tooltip={progressTooltip}
      />
      {classifierJob && (
        <Typography variant="caption" color="textSecondary" textAlign="center" mt={-3}>
          Status: {classifierJob.status} - {classifierJob.status_message}
        </Typography>
      )}
    </Stack>
  );
}

export default ClassifierJobProgressBar;
