import { jobQueries, useJobRefetchInterval } from "@core/job";
import { ImportJobRead } from "@models/ImportJobRead";
import { useQuery } from "@tanstack/react-query";

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (per-import-type invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
export const useLiveImportJob = (importJobId: string | undefined, initialData: ImportJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ImportJobRead>();
  return useQuery({
    ...jobQueries.import.byId(importJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};
