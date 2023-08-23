import { useMutation, useQuery } from "@tanstack/react-query";
import { ExportJobRead, BackgroundJobStatus, ExportService } from "./openapi";
import { QueryKey } from "./QueryKey";

const useStartExportJob = () => useMutation(ExportService.startExportJob);

const useGetExportJob = (exportJobId: string | undefined) => {
  // filter out all disabled code ids
  return useQuery<ExportJobRead, Error>(
    [QueryKey.EXPORT_JOB, exportJobId],
    () =>
      ExportService.getExportJob({
        exportJobId: exportJobId!,
      }),
    {
      enabled: !!exportJobId,
      refetchInterval(data, query) {
        if (!data) {
          return 1000;
        }
        if (data.status) {
          switch (data.status) {
            case BackgroundJobStatus.ERRORNEOUS:
            case BackgroundJobStatus.FINISHED:
              return false;
            case BackgroundJobStatus.WAITING:
            case BackgroundJobStatus.RUNNING:
              return 1000;
          }
        }
        return false;
      },
    }
  );
};

const ExporterHooks = {
  useGetExportJob,
  useStartExportJob,
};

export default ExporterHooks;
