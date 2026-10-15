import { queryClient } from "@api/queryClient";
import { JobService } from "@api/services/JobService";
import { mlAutomationQueries } from "./mlAutomationQueries";
import { MlJobRead } from "@models/MlJobRead";
import { useMutation } from "@tanstack/react-query";

const useStartMLJob = () =>
  useMutation({
    mutationKey: [...mlAutomationQueries.job.all(), "start"],
    mutationFn: JobService.startMlJob,
    onSuccess: (job) => {
      // Force refetch of all ML jobs when adding a new one.
      queryClient.invalidateQueries({ queryKey: mlAutomationQueries.job.byProject(job.input.project_id).queryKey });
    },
    meta: {
      successMessage: (data: MlJobRead) => `Started ML Job as a new background task (ID: ${data.job_id})`,
    },
  });

export const MlAutomationHooks = {
  useStartMLJob,
};
