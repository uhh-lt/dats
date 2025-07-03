import { Card, CardContent, CircularProgress, Stack, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { PerspectivesJobRead } from "../../../api/openapi/models/PerspectivesJobRead.ts";
import { PerspectivesJobType } from "../../../api/openapi/models/PerspectivesJobType.ts";

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
  // Embedding Model
  [PerspectivesJobType.REFINE_MODEL]: "Refine Model",
  [PerspectivesJobType.RESET_MODEL]: "Reset Model",
};

const jobStatus2Title: Record<BackgroundJobStatus, string> = {
  [BackgroundJobStatus.WAITING]: "Pending",
  [BackgroundJobStatus.RUNNING]: "in Progress",
  [BackgroundJobStatus.FINISHED]: "Finished",
  [BackgroundJobStatus.ERRORNEOUS]: "Failed",
  [BackgroundJobStatus.ABORTED]: "Canceled",
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
              {perspectivesJobType2Title[perspectivesJob.perspectives_job_type]}{" "}
              {perspectivesJob.status ? jobStatus2Title[perspectivesJob.status] : "?"}
            </Typography>
            {perspectivesJob.status === BackgroundJobStatus.RUNNING && <CircularProgress size={24} color="primary" />}
          </Stack>
          <Stepper activeStep={perspectivesJob.step}>
            {perspectivesJob.steps.map((label, index) => {
              const labelProps: {
                optional?: React.ReactNode;
                error?: boolean;
              } = {};
              if (index === perspectivesJob.step && perspectivesJob.status === BackgroundJobStatus.ERRORNEOUS) {
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
            Detailed status: {perspectivesJob.status_msg}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
export default ClusterJobProgressCard;
