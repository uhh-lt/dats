import { queryClient } from "@api/queryClient";
import { WhiteboardService } from "@api/services/WhiteboardService";
import { annotationQueries } from "@core/annotation";
import { CodeMap, codeQueries } from "@core/code";
import { memoQueries } from "@core/memo";
import { sdocQueries } from "@core/source-document";
import { tagQueries } from "@core/tag";
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
 *   whiteboardQueries.data(projectId, id)    ["whiteboards", "data", id]
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

  // the content of one whiteboard. Its queryFn seeds the caches of the entities on the board, so that the nodes
  // do not have to fetch them one by one.
  dataScope: () => [...whiteboardQueries.all(), "data"] as const,
  data: (projectId: number, whiteboardId: number) =>
    queryOptions({
      queryKey: [...whiteboardQueries.dataScope(), whiteboardId] as const,
      queryFn: async () => {
        const whiteboardData = await WhiteboardService.getDataById({ whiteboardId });

        whiteboardData.span_annotations.forEach((sa) => {
          queryClient.setQueryData(annotationQueries.span.byId(sa.id).queryKey, sa);
        });
        whiteboardData.sent_annotations.forEach((sa) => {
          queryClient.setQueryData(annotationQueries.sentence.byId(sa.id).queryKey, sa);
        });
        whiteboardData.bbox_annotations.forEach((ba) => {
          queryClient.setQueryData(annotationQueries.bbox.byId(ba.id).queryKey, ba);
        });
        whiteboardData.memos.forEach((memo) => {
          queryClient.setQueryData(memoQueries.byId(memo.id).queryKey, memo);
        });
        whiteboardData.sdocs.forEach((sdoc) => {
          queryClient.setQueryData(sdocQueries.detail(sdoc.id).queryKey, sdoc);
        });
        if (whiteboardData.codes.length > 0) {
          const codeMap = whiteboardData.codes.reduce((acc, code) => {
            acc[code.id] = code;
            return acc;
          }, {} as CodeMap);
          queryClient.setQueryData(codeQueries.byProject(projectId).queryKey, codeMap);
        }
        if (whiteboardData.tags.length > 0) {
          queryClient.setQueryData(tagQueries.byProject(projectId).queryKey, whiteboardData.tags);
        }

        return whiteboardData;
      },
    }),
};
