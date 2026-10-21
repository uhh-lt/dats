import { queryClient } from "@api/queryClient";
import { WhiteboardService } from "@api/services/WhiteboardService";
import { bboxAnnotationQueries } from "@core/bbox-annotation";
import { CodeMap, codeQueries } from "@core/code";
import { memoQueries } from "@core/memo";
import { sentenceAnnotationQueries } from "@core/sentence-annotation";
import { sdocQueries } from "@core/source-document";
import { spanAnnotationQueries } from "@core/span-annotation";
import { tagQueries } from "@core/tag";
import type { WhiteboardRead } from "@models/WhiteboardRead";
import { queryOptions } from "@tanstack/react-query";

export type WhiteboardMap = Record<number, WhiteboardRead>;

/**
 * Query factory for whiteboards.
 *
 *   whiteboardQueries.all()                  ["whiteboard"]
 *   whiteboardQueries.byProject(projectId)   ["whiteboard", "project", projectId]
 *   whiteboardQueries.data(projectId, id)    ["whiteboard", "data", id]
 */
export const whiteboardQueries = {
  all: () => ["whiteboard"] as const,

  // all whiteboards of a project, as a map by whiteboard id
  byProjectScope: () => [...whiteboardQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...whiteboardQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const data = await WhiteboardService.getByProject({ projectId });
        return data.reduce<WhiteboardMap>((acc, whiteboard) => {
          acc[whiteboard.id] = whiteboard;
          return acc;
        }, {});
      },
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
          queryClient.setQueryData(spanAnnotationQueries.byId(sa.id).queryKey, sa);
        });
        whiteboardData.sent_annotations.forEach((sa) => {
          queryClient.setQueryData(sentenceAnnotationQueries.byId(sa.id).queryKey, sa);
        });
        whiteboardData.bbox_annotations.forEach((ba) => {
          queryClient.setQueryData(bboxAnnotationQueries.byId(ba.id).queryKey, ba);
        });
        whiteboardData.memos.forEach((memo) => {
          queryClient.setQueryData(memoQueries.byId(memo.id).queryKey, memo);
        });
        whiteboardData.sdocs.forEach((sdoc) => {
          queryClient.setQueryData(sdocQueries.byId(sdoc.id).queryKey, sdoc);
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
