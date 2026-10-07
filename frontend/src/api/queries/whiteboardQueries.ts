import { WhiteboardService } from "@api/services/WhiteboardService";
import type { WhiteboardRead } from "@models/WhiteboardRead";
import { queryOptions } from "@tanstack/react-query";

export type WhiteboardMap = Record<number, WhiteboardRead>;

const fetchWhiteboards = async (projectId: number) => {
  const data = await WhiteboardService.getByProject({ projectId });
  return data.reduce<WhiteboardMap>((acc, whiteboard) => {
    acc[whiteboard.id] = whiteboard;
    return acc;
  }, {});
};

/**
 * Query factory for whiteboards.
 *
 *   whiteboardQueries.all()                  ["whiteboards"]
 *   whiteboardQueries.byProject(projectId)   ["whiteboards", "project", projectId]
 */
export const whiteboardQueries = {
  all: () => ["whiteboards"] as const,

  // all whiteboards of a project, as a map by whiteboard id
  byProjectScope: () => [...whiteboardQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...whiteboardQueries.byProjectScope(), projectId] as const,
      queryFn: () => fetchWhiteboards(projectId),
      staleTime: 1000 * 60 * 5,
    }),
};
