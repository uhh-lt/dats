import { Card, CardContent, CircularProgress, Stack, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { JobStatus } from "../../../api/openapi/models/JobStatus.ts";
import { PerspectivesJobRead } from "../../../api/openapi/models/PerspectivesJobRead.ts";
import { PerspectivesJobType } from "../../../api/openapi/models/PerspectivesJobType.ts";

const RUNNING_OR_WAITING = [JobStatus.QUEUED, JobStatus.DEFERRED, JobStatus.SCHEDULED, JobStatus.STARTED];

const perspectivesJobType2Title: Record<PerspectivesJobType, string> = {
  // Aspects
  [PerspectivesJobType.CREATE_ASPECT]: "Map Creation",
  [PerspectivesJobType.ADD_MISSING_DOCS_TO_ASPECT]: "Add Missing Documents to Map",
  // Clusters
  [PerspectivesJobType.CREATE_CLUSTER_WITH_NAME]: "Cluster Creation",
  [PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS]: "Cluster Creation",
  [PerspectivesJobType.REMOVE_CLUSTER]: "Remove Cluster from Map",
  [PerspectivesJobType.SPLIT_CLUSTER]: "Split Cluster in Map",
  [PerspectivesJobType.MERGE_CLUSTERS]: "Merge Cluster in Map",
  [PerspectivesJobType.CHANGE_CLUSTER]: "Change Cluster",
  [PerspectivesJobType.RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION]: "Recompute Cluster Description",
  // Embedding Model
  [PerspectivesJobType.REFINE_MODEL]: "Refine Model",
  [PerspectivesJobType.RESET_MODEL]: "Reset Model",
};

interface PerspectivesJobProgressCardProps {
  perspectivesJob: PerspectivesJobRead;
}

function ClusterJobProgressCard({ perspectivesJob }: PerspectivesJobProgressCardProps) {
  return (
    <Card variant="outlined" sx={{ borderColor: "grey.500" }}>
      <CardContent sx={{ p: 1, pb: "8px !important" }}>
        <Stack spacing={4}>
          <Stack direction={"row"} spacing={2} alignItems="center" justifyContent="center">
            <Typography variant="h6" color="primary.dark" textAlign="center">
              {perspectivesJobType2Title[perspectivesJob.input.perspectives_job_type]}{" "}
              {perspectivesJob.status.valueOf()}
            </Typography>
            {RUNNING_OR_WAITING.includes(perspectivesJob.status) && <CircularProgress size={24} color="primary" />}
          </Stack>
          <Stepper activeStep={perspectivesJob.current_step}>
            {perspectivesJob.steps.map((label, index) => {
              const labelProps: {
                optional?: React.ReactNode;
                error?: boolean;
              } = {};
              if (index === perspectivesJob.current_step && perspectivesJob.status === JobStatus.FAILED) {
                labelProps.optional = (
                  <Typography variant="caption" color="error">
                    An error occurred!
                  </Typography>
                );
                labelProps.error = true;
              }

              return (
                <Step key={label}>
                  <StepLabel {...labelProps}>{label}</StepLabel>
                </Step>
              );
            })}
          </Stepper>
          <Typography variant="body1" color="textSecondary" pl={1}>
            Detailed status: {perspectivesJob.status_message || "No status message available."}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
export default ClusterJobProgressCard;
