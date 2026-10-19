import { JobService } from "@api/services/JobService";
import { mlAutomationQueries } from "./mlAutomationQueries";
import { MlJobRead } from "@models/MlJobRead";
import { useMutation } from "@tanstack/react-query";

const useStartMLJob = () =>
  useMutation({
    mutationKey: [...mlAutomationQueries.job.all(), "start"],
    mutationFn: JobService.startMlJob,
    meta: {
      datsEvent: "JOB_UPDATED",
      successMessage: (data: MlJobRead) => `Started ML Job as a new background task (ID: ${data.job_id})`,
    },
  });

export const MlAutomationHooks = {
  useStartMLJob,
};
