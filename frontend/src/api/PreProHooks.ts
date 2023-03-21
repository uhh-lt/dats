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
        console.log(data?.in_progress, data?.num_sdocs_finished, data?.num_sdocs_in_progress);
        if (!data) {
          return 1000;
        }
        if (data.in_progress) {
          return data.num_sdocs_finished === data.num_sdocs_in_progress ? false : 1000;
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
