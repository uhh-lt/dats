import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { ExportJobRead } from "./openapi/models/ExportJobRead.ts";
import { ExportService } from "./openapi/services/ExportService.ts";

const useStartExportJob = () =>
  useMutation({
    mutationFn: ExportService.startExportJob,
    meta: {
      successMessage: "Export job started! Please wait...",
      errorMessage: "Failed to gather documents for export",
    },
  });

const usePollExportJob = (exportJobId: string | undefined) => {
  // filter out all disabled code ids
  return useQuery<ExportJobRead, Error>({
    queryKey: [QueryKey.EXPORT_JOB, exportJobId],
    queryFn: () =>
      ExportService.getExportJob({
        exportJobId: exportJobId!,
      }),
    enabled: !!exportJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }
      if (query.state.data.status) {
        switch (query.state.data.status) {
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
  });
};

const ExporterHooks = {
  usePollExportJob,
  useStartExportJob,
};

export default ExporterHooks;
