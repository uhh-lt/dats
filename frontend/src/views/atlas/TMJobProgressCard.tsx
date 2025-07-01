import { Card, CardContent, CircularProgress, Stack, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { TMJobRead } from "../../api/openapi/models/TMJobRead.ts";
import { TMJobType } from "../../api/openapi/models/TMJobType.ts";

const tmJobType2Title: Record<TMJobType, string> = {
  // Aspects
  [TMJobType.CREATE_ASPECT]: "Map Creation",
  [TMJobType.ADD_MISSING_DOCS_TO_ASPECT]: "Add Missing Documents to Map",
  // Topics
  [TMJobType.CREATE_TOPIC_WITH_NAME]: "Cluster Creation",
  [TMJobType.CREATE_TOPIC_WITH_SDOCS]: "Cluster Creation",
  [TMJobType.REMOVE_TOPIC]: "Remove Cluster from Map",
  [TMJobType.SPLIT_TOPIC]: "Split Cluster in Map",
  [TMJobType.MERGE_TOPICS]: "Merge Cluster in Map",
  [TMJobType.CHANGE_TOPIC]: "Change Cluster",
  // Topic Model
  [TMJobType.REFINE_TOPIC_MODEL]: "Refine Model",
  [TMJobType.RESET_TOPIC_MODEL]: "Reset Model",
};

const jobStatus2Title: Record<BackgroundJobStatus, string> = {
  [BackgroundJobStatus.WAITING]: "Pending",
  [BackgroundJobStatus.RUNNING]: "in Progress",
  [BackgroundJobStatus.FINISHED]: "Finished",
  [BackgroundJobStatus.ERRORNEOUS]: "Failed",
  [BackgroundJobStatus.ABORTED]: "Canceled",
};

interface TMJobProgressCardProps {
  tmJob: TMJobRead;
}

function TMJobProgressCard({ tmJob }: TMJobProgressCardProps) {
  return (
    <Card variant="outlined" sx={{ borderColor: "grey.500" }}>
      <CardContent sx={{ p: 1, pb: "8px !important" }}>
        <Stack spacing={4}>
          <Stack direction={"row"} spacing={2} alignItems="center" justifyContent="center">
            <Typography variant="h6" color="primary.dark" textAlign="center">
              {tmJobType2Title[tmJob.tm_job_type]} {tmJob.status ? jobStatus2Title[tmJob.status] : "?"}
            </Typography>
            {tmJob.status === BackgroundJobStatus.RUNNING && <CircularProgress size={24} color="primary" />}
          </Stack>
          <Stepper activeStep={tmJob.step}>
            {tmJob.steps.map((label, index) => {
              const labelProps: {
                optional?: React.ReactNode;
                error?: boolean;
              } = {};
              if (index === tmJob.step && tmJob.status === BackgroundJobStatus.ERRORNEOUS) {
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
            Detailed status: {tmJob.status_msg}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
export default TMJobProgressCard;
