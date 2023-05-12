import { useQuery } from "@tanstack/react-query";
import { PreProProjectStatus, PreproService } from "./openapi";
import { QueryKey } from "./QueryKey";

const useGetPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>([QueryKey.PREPRO_PROJECT_STATUS, projectId], () =>
    PreproService.getProjectPreproStatus({ projId: projectId })
  );

const usePollPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>(
    [QueryKey.PREPRO_PROJECT_STATUS, projectId],
    () => PreproService.getProjectPreproStatus({ projId: projectId }),
    {
      enabled: true,
      refetchInterval(data, _) {
        if (!data) {
          return 1000;
        }
        if (data.num_sdocs_total > data.num_sdocs_in_progress) {
          return 1000;
        }
        return false;
      },
    }
  );

const PreProHooks = {
  useGetPreProProjectStatus,
  usePollPreProProjectStatus,
};

export default PreProHooks;
