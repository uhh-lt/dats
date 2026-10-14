import { queryClient } from "@api/queryClient";
import { JobService } from "@api/services/JobService";
import { useJobRefetchInterval } from "@core/job";
import { mlAutomationQueries } from "./mlAutomationQueries";
import { MlJobRead } from "@models/MlJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";

const useLiveMLJob = (mlJobId: string | undefined, initialData: MlJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<MlJobRead>();
  return useQuery({
    ...mlAutomationQueries.job.byId(mlJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useStartMLJob = () =>
  useMutation({
    mutationKey: [...mlAutomationQueries.job.all(), "startMLJob"],
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
  useLiveMLJob,
  useStartMLJob,
};
