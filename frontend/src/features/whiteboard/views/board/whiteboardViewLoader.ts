import { annotationQueries } from "@api/queries/annotationQueries";
import { CodeMap, codeQueries } from "@api/queries/codeQueries";
import { memoQueries } from "@api/queries/memoQueries";
import { sdocQueries } from "@api/queries/sdocQueries";
import { tagQueries } from "@api/queries/tagQueries";
import { whiteboardQueries } from "@api/queries/whiteboardQueries";
import { WhiteboardService } from "@api/services/WhiteboardService";
import { QueryClient } from "@tanstack/react-query";

interface WhiteboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  whiteboardId: number;
}

export async function whiteboardViewLoader({ queryClient, projectId, whiteboardId }: WhiteboardViewLoaderArgs) {
  const [whiteboardData, whiteboardMap] = await Promise.all([
    WhiteboardService.getDataById({ whiteboardId }),
    queryClient.ensureQueryData(whiteboardQueries.byProject(projectId)),
  ]);

  // Pre-warm related entity caches so node components don't need to fetch individually
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

  return whiteboardMap[whiteboardId];
}
