import { QueryKey } from "@api/hooks/QueryKey";
import { ProjectService } from "@api/services/ProjectService";
import { queryOptions } from "@tanstack/react-query";

export const userProjectsQueryOptions = () =>
  queryOptions({
    queryKey: [QueryKey.USER_PROJECTS],
    queryFn: () => ProjectService.getUserProjects(),
    staleTime: 1000 * 60 * 5,
  });
