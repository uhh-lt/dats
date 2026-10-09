import { queryClient } from "@api/queryClient";
import { JobService } from "@api/services/JobService";
import { jobQueries } from "@core/job";
import { MlJobRead } from "@models/MlJobRead";
import { useMutation } from "@tanstack/react-query";

export const useStartMLJob = () =>
  useMutation({
    mutationKey: [...jobQueries.ml.all(), "startMLJob"],
    mutationFn: JobService.startMlJob,
    onSuccess: (job) => {
      // Force refetch of all ML jobs when adding a new one.
      queryClient.invalidateQueries({ queryKey: jobQueries.ml.byProject(job.input.project_id).queryKey });
    },
    meta: {
      successMessage: (data: MlJobRead) => `Started ML Job as a new background task (ID: ${data.job_id})`,
    },
  });
