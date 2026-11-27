import { queryClient } from "@api/queryClient";
import { WhiteboardsService } from "@api/services/WhiteboardsService";
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
 *   whiteboardQueries.all()                    ["whiteboard"]
 *   whiteboardQueries.projectScope(projectId)  ["whiteboard", "project", projectId]
 *   whiteboardQueries.byProject(projectId)     ["whiteboard", "project", projectId]
 *   whiteboardQueries.data(projectId, id)      ["whiteboard", "project", projectId, "data", id]
 */
export const whiteboardQueries = {
  all: () => ["whiteboard"] as const,
  // prefix of all whiteboard queries of one project
  projectScope: (projectId: number) => [...whiteboardQueries.all(), "project", projectId] as const,

  // all whiteboards of a project, as a map by whiteboard id
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: whiteboardQueries.projectScope(projectId),
      queryFn: async () => {
        const data = await WhiteboardsService.getByProject({ projectId });
        return data.reduce<WhiteboardMap>((acc, whiteboard) => {
          acc[whiteboard.id] = whiteboard;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the content of one whiteboard. Its queryFn seeds the caches of the entities on the board, so that the nodes
  // do not have to fetch them one by one.
  dataScope: (projectId: number) => [...whiteboardQueries.projectScope(projectId), "data"] as const,
  data: (projectId: number, whiteboardId: number) =>
    queryOptions({
      queryKey: [...whiteboardQueries.dataScope(projectId), whiteboardId] as const,
      queryFn: async () => {
        const whiteboardData = await WhiteboardsService.getData({ projectId, whiteboardId });

        whiteboardData.span_annotations.forEach((sa) => {
          queryClient.setQueryData(spanAnnotationQueries.byId(sa.project_id, sa.id).queryKey, sa);
        });
        whiteboardData.sent_annotations.forEach((sa) => {
          queryClient.setQueryData(sentenceAnnotationQueries.byId(sa.project_id, sa.id).queryKey, sa);
        });
        whiteboardData.bbox_annotations.forEach((ba) => {
          queryClient.setQueryData(bboxAnnotationQueries.byId(ba.project_id, ba.id).queryKey, ba);
        });
        whiteboardData.memos.forEach((memo) => {
          queryClient.setQueryData(memoQueries.byId(memo.project_id, memo.id).queryKey, memo);
        });
        whiteboardData.sdocs.forEach((sdoc) => {
          queryClient.setQueryData(sdocQueries.byId(sdoc.project_id, sdoc.id).queryKey, sdoc);
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
