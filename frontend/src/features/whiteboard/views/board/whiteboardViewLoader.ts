import { QueryKey } from "@api/hooks/QueryKey";
import { CodeMap, codeQueries } from "@api/queries/codeQueries";
import { memoQueries } from "@api/queries/memoQueries";
import { tagQueries } from "@api/queries/tagQueries";
import { WhiteboardService } from "@api/services/WhiteboardService";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { QueryClient } from "@tanstack/react-query";
import { projectWhiteboardsQueryOptions } from "../../_api/whiteboardQueryOptions";

interface WhiteboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  whiteboardId: number;
}

export async function whiteboardViewLoader({ queryClient, projectId, whiteboardId }: WhiteboardViewLoaderArgs) {
  const [whiteboardData, whiteboardMap] = await Promise.all([
    WhiteboardService.getDataById({ whiteboardId }),
    queryClient.ensureQueryData(projectWhiteboardsQueryOptions(projectId)),
  ]);

  // Pre-warm related entity caches so node components don't need to fetch individually
  whiteboardData.span_annotations.forEach((sa) => {
    queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, sa.id], sa);
  });
  whiteboardData.sent_annotations.forEach((sa) => {
    queryClient.setQueryData<SentenceAnnotationRead>([QueryKey.SENTENCE_ANNOTATION, sa.id], sa);
  });
  whiteboardData.bbox_annotations.forEach((ba) => {
    queryClient.setQueryData<BBoxAnnotationRead>([QueryKey.BBOX_ANNOTATION, ba.id], ba);
  });
  whiteboardData.memos.forEach((memo) => {
    queryClient.setQueryData(memoQueries.byId(memo.id).queryKey, memo);
  });
  whiteboardData.sdocs.forEach((sdoc) => {
    queryClient.setQueryData<SourceDocumentRead>([QueryKey.SDOC, sdoc.id], sdoc);
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
