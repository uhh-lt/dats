import { jobQueries, useJobRefetchInterval } from "@core/job";
import { MlJobRead } from "@models/MlJobRead";
import { useQuery } from "@tanstack/react-query";

export const useLiveMLJob = (mlJobId: string | undefined, initialData: MlJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<MlJobRead>();
  return useQuery({
    ...jobQueries.ml.byId(mlJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};
