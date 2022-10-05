import { useQuery } from "@tanstack/react-query";
import { PreproService, PreProProjectStatus } from "./openapi";
import { QueryKey } from "./QueryKey";

const useGetPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>([QueryKey.PREPRO_PROJECT_STATUS, projectId], () =>
    PreproService.getProjectPreproStatusPreproProjectProjIdStatusGet({ projId: projectId})
  );

const PreProHooks = {
  useGetPreProProjectStatus,
};

export default PreProHooks;
