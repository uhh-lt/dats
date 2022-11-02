import { useQuery } from "@tanstack/react-query";
import { PreProProjectStatus, PreproService } from "./openapi";
import { QueryKey } from "./QueryKey";

const useGetPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>([QueryKey.PREPRO_PROJECT_STATUS, projectId], () =>
    PreproService.getProjectPreproStatus({ projId: projectId })
  );

const PreProHooks = {
  useGetPreProProjectStatus,
};

export default PreProHooks;
